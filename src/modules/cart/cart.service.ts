import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from '@/database/schemas/cart.schema';
import { Product, ProductDocument } from '@/database/schemas/product.schema';

// Constants for cart limits
const MAX_CART_ITEMS = 50; // Maximum number of unique products in cart
const MAX_QUANTITY_PER_ITEM = 1000; // Maximum quantity of a single product
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
      });
      return { items: [], _id: cart._id };
    }

    // Transform cart items to match the required interface
    const transformedItems = cart.items
      .map((item) => {
        const product = item.productId as any;
        if (!product || !product.variants || product.variants.length === 0) return null;

        let price = product.originalPrice;
        let attributes = {};
        let totalQuantity = 0;

        const variant = item.variantId
          ? product.variants.find((v) => v._id && v._id.toString() === item.variantId.toString())
          : null;

        if (!variant) return null;

        totalQuantity = variant.quantity || 0;

        if (totalQuantity === 0) return null;

        price =
          variant.price ??
          (variant.salePrice && product.isOnSale ? variant.salePrice : undefined) ??
          product.originalPrice;
        attributes = variant.attributes || {};

        return {
          _id: item._id.toString(),
          productId: product._id.toString(),
          variantId: item.variantId ? item.variantId.toString() : null,
          quantity: item.quantity,
          name: product.name,
          price: price,
          image: product.images && product.images.length > 0 ? product.images[0] : null,
          attributes: attributes,
          totalQuantity: totalQuantity,
        };
      })
      .filter(Boolean);

    return {
      _id: cart._id,
      items: transformedItems,
    };
  }

  async addToCart(userId: string, productId: string, quantity: number, variantId: string) {
    // Validate quantity
    if (quantity < MIN_QUANTITY_PER_ITEM) {
      throw new BadRequestException(`Quantity must be at least ${MIN_QUANTITY_PER_ITEM}`);
    }

    if (quantity > MAX_QUANTITY_PER_ITEM) {
      throw new BadRequestException(`Maximum quantity per item is ${MAX_QUANTITY_PER_ITEM}`);
    }

    // Validate product
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    // Validate variant if applicable
    let variantObjectId = null;
    if (product.variants && product.variants.length > 0) {
      if (!variantId) {
        throw new BadRequestException('Variant ID is required for this product');
      }

      variantObjectId = new Types.ObjectId(variantId);
      const variantExists = product.variants.some((v) => v._id?.toString() === variantId);
      if (!variantExists) {
        throw new BadRequestException('Invalid variant selected');
      }
    }

    // Find or create cart
    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!cart) {
      cart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    }

    // Check if cart has reached maximum unique items
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
      // Update existing item - ADD to current quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (newQuantity > MAX_QUANTITY_PER_ITEM) {
        throw new BadRequestException(`Cannot add more items. Maximum quantity per item is ${MAX_QUANTITY_PER_ITEM}`);
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      cart.items.push({
        productId: new Types.ObjectId(productId),
        variantId: variantObjectId,
        quantity,
      });
    }

    // Save cart
    await cart.save();

    return this.getCart(userId);
  }

  async updateCartItemById(userId: string, cartItemId: string, quantity: number) {
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

    // Find the item in the cart by its ID
    const itemIndex = cart.items.findIndex((item) => item._id.toString() === cartItemId);

    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart');
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;

    // Save cart
    await cart.save();

    return this.getCart(userId);
  }

  async removeFromCart(userId: string, productId: string, variantId?: string) {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!cart) {
      return { success: true };
    }

    // Find the item in the cart
    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId && (!variantId || item.variantId?.toString() === variantId),
    );

    if (itemIndex === -1) {
      return { success: true };
    }

    // Remove the item
    cart.items.splice(itemIndex, 1);

    // Save cart
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

  async removeCartItems(userId: string, itemIds: string[]) {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!cart) {
      return { success: true };
    }

    // Convert string IDs to ObjectId for comparison
    const objectIdSet = new Set(itemIds.map((id) => id.toString()));

    // Filter out items that should be removed
    cart.items = cart.items.filter((item) => !objectIdSet.has(item._id.toString()));

    // Save cart
    await cart.save();

    return this.getCart(userId);
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
      });
    }

    // Check if cart would exceed maximum items
    const newUniqueItems = guestCartItems.filter(
      (guestItem) =>
        !cart.items.some(
          (item) =>
            item.productId.toString() === guestItem.productId &&
            (!guestItem.variantId || item.variantId?.toString() === guestItem.variantId),
        ),
    );

    if (cart.items.length + newUniqueItems.length > MAX_CART_ITEMS) {
      throw new BadRequestException(`Cart cannot contain more than ${MAX_CART_ITEMS} unique items`);
    }

    // Process each guest cart item
    for (const guestItem of guestCartItems) {
      const product = await this.productModel.findById(guestItem.productId);
      if (!product || !product.isActive || !product.variants || product.variants.length === 0) {
        continue;
      }

      let variantObjectId = null;

      if (guestItem.variantId) {
        variantObjectId = new Types.ObjectId(guestItem.variantId);

        const variant = product.variants.find((v) => v._id?.toString() === guestItem.variantId);

        if (!variant) {
          continue;
        }
      }

      const existingItemIndex = cart.items.findIndex(
        (item) =>
          item.productId.toString() === guestItem.productId &&
          (!guestItem.variantId || item.variantId?.toString() === guestItem.variantId),
      );

      const quantity = Math.min(Math.max(guestItem.quantity, MIN_QUANTITY_PER_ITEM), MAX_QUANTITY_PER_ITEM);

      if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity = Math.max(cart.items[existingItemIndex].quantity, quantity);
      } else {
        cart.items.push({
          productId: new Types.ObjectId(guestItem.productId),
          variantId: variantObjectId,
          quantity,
        });
      }
    }

    // Save cart
    await cart.save();

    return this.getCart(userId);
  }
}
