import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from '@/database/schemas/cart.schema';
import { Product, ProductDocument } from '@/database/schemas/product.schema';

// Constants for cart limits
const MAX_CART_ITEMS = 50; // Maximum number of unique products in cart
const MAX_QUANTITY_PER_ITEM = 10; // Maximum quantity of a single product
const MIN_QUANTITY_PER_ITEM = 1; // Minimum quantity of a single product

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async getCart(userId: string) {
    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) }).populate({
      path: 'items.productId',
      select: 'name slug images variants originalPrice isOnSale',
    });

    if (!cart) {
      // Create an empty cart if none exists
      cart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
        totalPrice: 0,
      });
    }

    // Transform the cart data for the client
    const transformedItems = cart.items.map((item) => {
      const product = item.productId as any;

      return {
        productId: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images && product.images.length > 0 ? product.images[0] : null,
        price: item.price,
        quantity: item.quantity,
        variantId: item.variantId,
        attributes: item.attributes,
        total: item.price * item.quantity,
      };
    });

    return {
      items: transformedItems,
      meta: {
        totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        totalUniqueItems: cart.items.length,
        totalPrice: cart.totalPrice,
      },
    };
  }

  async addToCart(
    userId: string,
    productId: string,
    quantity: number,
    variantId?: string,
    attributes?: Record<string, string>,
  ) {
    // Validate quantity
    if (quantity < MIN_QUANTITY_PER_ITEM) {
      throw new BadRequestException(`Quantity must be at least ${MIN_QUANTITY_PER_ITEM}`);
    }

    if (quantity > MAX_QUANTITY_PER_ITEM) {
      throw new BadRequestException(`Maximum quantity per item is ${MAX_QUANTITY_PER_ITEM}`);
    }

    // Verify product exists and is active
    const product = await this.productModel.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      throw new NotFoundException('Product not found or is not available');
    }

    // Determine price based on variant or product
    let price = product.originalPrice;
    let variantObjectId = null;

    if (variantId && product.variants && product.variants.length > 0) {
      const variant = product.variants.find((v) => v._id.toString() === variantId);
      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }
      price = variant.price;
      variantObjectId = new Types.ObjectId(variantId);
    }

    // Find or create cart
    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!cart) {
      cart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
        totalPrice: 0,
      });
    }

    // Check if adding this would exceed the maximum cart items
    if (
      cart.items.length >= MAX_CART_ITEMS &&
      !cart.items.some(
        (item) => item.productId.toString() === productId && (!variantId || item.variantId?.toString() === variantId),
      )
    ) {
      throw new BadRequestException(`Cart cannot contain more than ${MAX_CART_ITEMS} unique items`);
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId && (!variantId || item.variantId?.toString() === variantId),
    );

    if (existingItemIndex > -1) {
      // Update existing item
      cart.items[existingItemIndex].quantity = quantity;
      cart.items[existingItemIndex].price = price;
      if (attributes) {
        cart.items[existingItemIndex].attributes = attributes;
      }
    } else {
      // Add new item
      cart.items.push({
        productId: new Types.ObjectId(productId),
        variantId: variantObjectId,
        quantity,
        price,
        attributes,
      });
    }

    // Save cart (pre-save hook will calculate totalPrice)
    await cart.save();

    return this.getCart(userId);
  }

  async updateCartItemQuantity(userId: string, productId: string, quantity: number, variantId?: string) {
    // Validate quantity
    if (quantity < MIN_QUANTITY_PER_ITEM) {
      throw new BadRequestException(`Quantity must be at least ${MIN_QUANTITY_PER_ITEM}`);
    }

    if (quantity > MAX_QUANTITY_PER_ITEM) {
      throw new BadRequestException(`Maximum quantity per item is ${MAX_QUANTITY_PER_ITEM}`);
    }

    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Find the item in the cart
    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId && (!variantId || item.variantId?.toString() === variantId),
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart');
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;

    // Save cart (pre-save hook will calculate totalPrice)
    await cart.save();

    return this.getCart(userId);
  }

  async removeFromCart(userId: string, productId: string, variantId?: string) {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Find the item in the cart
    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId && (!variantId || item.variantId?.toString() === variantId),
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart');
    }

    // Remove the item
    cart.items.splice(itemIndex, 1);

    // Save cart (pre-save hook will calculate totalPrice)
    await cart.save();

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!cart) {
      return { success: true };
    }

    // Clear all items
    cart.items = [];

    await cart.save();

    return { success: true };
  }

  // Method to merge guest cart with user cart after login
  async mergeGuestCart(userId: string, guestCartItems: any[]) {
    if (!guestCartItems || guestCartItems.length === 0) {
      return this.getCart(userId);
    }

    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!cart) {
      cart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
        totalPrice: 0,
      });
    }

    // Process each guest cart item
    for (const guestItem of guestCartItems) {
      // Verify product exists and is active
      const product = await this.productModel.findOne({
        _id: guestItem.productId,
        isActive: true,
      });

      if (!product) {
        continue; // Skip invalid products
      }

      // Determine price based on variant or product
      let price = product.originalPrice;
      let variantObjectId = null;

      if (guestItem.variantId && product.variants && product.variants.length > 0) {
        const variant = product.variants.find((v) => v._id.toString() === guestItem.variantId);
        if (!variant) {
          continue; // Skip invalid variants
        }
        price = variant.price;
        variantObjectId = new Types.ObjectId(guestItem.variantId);
      }

      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(
        (item) =>
          item.productId.toString() === guestItem.productId &&
          (!guestItem.variantId || item.variantId?.toString() === guestItem.variantId),
      );

      // Ensure we don't exceed max items
      if (cart.items.length >= MAX_CART_ITEMS && existingItemIndex === -1) {
        continue; // Skip if we would exceed max items
      }

      // Ensure quantity is within limits
      const quantity = Math.min(Math.max(guestItem.quantity, MIN_QUANTITY_PER_ITEM), MAX_QUANTITY_PER_ITEM);

      if (existingItemIndex > -1) {
        // Update existing item - take the higher quantity
        cart.items[existingItemIndex].quantity = Math.max(cart.items[existingItemIndex].quantity, quantity);
        cart.items[existingItemIndex].price = price;
        if (guestItem.attributes) {
          cart.items[existingItemIndex].attributes = guestItem.attributes;
        }
      } else {
        // Add new item
        cart.items.push({
          productId: new Types.ObjectId(guestItem.productId),
          variantId: variantObjectId,
          quantity,
          price,
          attributes: guestItem.attributes,
        });
      }
    }

    // Save cart (pre-save hook will calculate totalPrice)
    await cart.save();

    return this.getCart(userId);
  }
}
