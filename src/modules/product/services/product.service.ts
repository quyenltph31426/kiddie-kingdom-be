import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '@/database/schemas/product.schema';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async updateVariantStockOnOrder(
    productId: string,
    variantId: string,
    quantity: number,
    isOrderCreation: boolean,
  ): Promise<void> {
    // If isOrderCreation is true, we decrease quantity and increase soldCount
    // If isOrderCreation is false, we increase quantity and decrease soldCount
    const quantityChange = isOrderCreation ? -quantity : quantity;
    const soldCountChange = isOrderCreation ? quantity : -quantity;

    const result = await this.productModel.updateOne(
      {
        _id: new Types.ObjectId(productId),
        'variants._id': new Types.ObjectId(variantId),
      },
      {
        $inc: {
          'variants.$.quantity': quantityChange,
          'variants.$.soldCount': soldCountChange,
          totalSoldCount: soldCountChange,
        },
      },
    );

    if (result.modifiedCount === 0) {
      this.logger.warn(`Failed to update variant stock for product ${productId}, variant ${variantId}`);
      throw new NotFoundException('Product variant not found');
    }

    this.logger.log(
      `Updated variant stock for product ${productId}, variant ${variantId}: ` +
        `quantity ${quantityChange > 0 ? '+' : ''}${quantityChange}, ` +
        `soldCount ${soldCountChange > 0 ? '+' : ''}${soldCountChange}`,
    );
  }

  async incrementVariantSoldCount(productId: string, variantId: string, quantity: number): Promise<void> {
    const result = await this.productModel.updateOne(
      {
        _id: new Types.ObjectId(productId),
        'variants._id': new Types.ObjectId(variantId),
      },
      {
        $inc: {
          'variants.$.soldCount': quantity,
          totalSoldCount: quantity,
        },
      },
    );

    if (result.modifiedCount === 0) {
      this.logger.warn(`Failed to increment variant sold count for product ${productId}, variant ${variantId}`);
      throw new NotFoundException('Product variant not found');
    }

    this.logger.log(`Incremented variant sold count for product ${productId}, variant ${variantId}: +${quantity}`);
  }

  async checkVariantStock(productId: string, variantId: string, quantity: number): Promise<boolean> {
    const product = await this.productModel.findOne(
      {
        _id: new Types.ObjectId(productId),
        'variants._id': new Types.ObjectId(variantId),
      },
      { 'variants.$': 1 },
    );

    if (!product || !product.variants || product.variants.length === 0) {
      throw new NotFoundException('Product variant not found');
    }

    const variant = product.variants[0];
    return variant.quantity >= quantity;
  }
}
