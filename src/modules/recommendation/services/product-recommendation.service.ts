import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from '@/database/schemas/product.schema';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductRecommendationService {
  private readonly logger = new Logger(ProductRecommendationService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    private readonly configService: ConfigService,
  ) {
    // Khởi tạo Google Generative AI
    const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    if (!apiKey) {
      this.logger.error('GOOGLE_AI_API_KEY is not defined in environment variables');
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }
  }

  async getRecommendedProducts(userDescription: string, limit: number = 5): Promise<any> {
    try {
      if (!this.model) {
        throw new Error('Google AI model is not initialized');
      }

      const allProducts = await this.productModel
        .find({ isActive: true })
        .select('name description tags brandName categories primaryCategoryId')
        .populate('primaryCategoryId', 'name')
        .populate('categories', 'name')
        .lean();

      if (!allProducts || allProducts.length === 0) {
        return {
          success: false,
          message: 'No products available for recommendation',
          items: [],
        };
      }

      // Chuẩn bị dữ liệu sản phẩm để gửi cho AI
      const productsData = allProducts.map((product) => ({
        id: product._id.toString(),
        name: product.name,
        description: product.description || '',
        tags: product.tags || [],
        brandName: product.brandName || '',
        // primaryCategory: product.primaryCategoryId?.name || '',
        // categories: product.categories?.map((cat) => cat.name).join(', ') || '',
      }));

      // Tạo prompt cho AI
      const prompt = `
      Bạn là một trợ lý mua sắm thông minh. Dựa trên mô tả của người dùng, hãy gợi ý các sản phẩm phù hợp nhất từ danh sách sản phẩm có sẵn.

      Mô tả của người dùng: "${userDescription}"

      Danh sách sản phẩm có sẵn (dạng JSON):
      ${JSON.stringify(productsData, null, 2)}

      Hãy phân tích mô tả của người dùng và chọn tối đa ${limit} sản phẩm phù hợp nhất. Trả về kết quả dưới dạng mảng JSON chỉ chứa các ID sản phẩm được chọn, không có thông tin khác. Ví dụ: ["id1", "id2", "id3"]
      `;

      // Gọi API Google Generative AI
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Xử lý kết quả từ AI
      let recommendedIds: string[] = [];
      try {
        // Tìm mảng JSON trong phản hồi
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
          recommendedIds = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON array found in AI response');
        }
      } catch (error) {
        this.logger.error(`Error parsing AI response: ${error.message}`);
        this.logger.debug(`AI response: ${text}`);

        // Fallback: Tìm các ID trong văn bản
        const idMatches = text.match(/"([a-f\d]{24})"/g);
        if (idMatches) {
          recommendedIds = idMatches.map((id) => id.replace(/"/g, ''));
        }
      }

      // Lấy thông tin chi tiết của các sản phẩm được gợi ý
      const recommendedProducts = await this.productModel
        .find({
          _id: { $in: recommendedIds.map((id) => new Types.ObjectId(id)) },
          isActive: true,
        })
        .populate('primaryCategoryId', 'name slug')
        .populate('brandId', 'name slug')
        .select('name slug images variants originalPrice averageRating reviewCount');

      // Định dạng kết quả trả về
      const products = recommendedProducts.map((item) => {
        const product = item.toObject ? item.toObject() : item;
        const { primaryCategoryId, brandId, variants, ...rest } = product;

        return {
          ...rest,
          primaryCategory: primaryCategoryId,
          brand: brandId,
          currentPrice: Math.min(...variants.map((variant) => variant.price)),
          totalQuantity: variants.reduce((acc, variant) => acc + variant.quantity, 0),
          totalSoldCount: variants.reduce((acc, variant) => acc + (variant.soldCount || 0), 0),
        };
      });

      return {
        success: true,
        message: 'Products recommended successfully',
        items: products,
        meta: {
          total: products.length,
          description: userDescription,
        },
      };
    } catch (error) {
      this.logger.error(`Error in product recommendation: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to get product recommendations',
        error: error.message,
        items: [],
      };
    }
  }
}
