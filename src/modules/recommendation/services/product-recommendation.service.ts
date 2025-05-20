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

  async getRecommendedProducts(userDescription: string, limit: number = 5, chatHistory: string[] = []): Promise<any> {
    try {
      if (!this.model) {
        throw new Error('Google AI model is not initialized');
      }

      const allProducts = await this.productModel
        .find({ isActive: true })
        .select('name description tags brandName categories primaryCategoryId')
        .populate('primaryCategoryId', 'name')
        .populate('brandId', 'name')
        .lean();

      if (!allProducts || allProducts.length === 0) {
        return {
          success: false,
          message: 'No products available for recommendation',
          items: [],
          responseText: 'Xin lỗi, hiện tại không có sản phẩm nào trong hệ thống.',
        };
      }

      console.log(allProducts);

      const productsData = allProducts.map((product) => ({
        id: product._id.toString(),
        name: product.name,
        description: product.description || '',
        tags: product.tags || [],
        brandName: product.brandName || '',
      }));

      // Format chat history for the prompt
      let chatHistoryText = '';
      if (chatHistory && chatHistory.length > 0) {
        chatHistoryText = 'Previous conversation:\n';
        chatHistory.forEach((message, index) => {
          const role = index % 2 === 0 ? 'User' : 'Assistant';
          chatHistoryText += `${role}: ${message}\n`;
        });
        chatHistoryText += '\n';
      }

      // Create prompt for AI assistant in English
      const prompt = `
      You are an AI assistant for "Kiddie Kingdom", a magical kingdom for children that specializes in providing creative, safe, and colorful toys for children of all ages. The website has a friendly, easy-to-use interface with clear categories: educational toys, building toys, stuffed animals, active toys, and much more. Each product has vivid images, detailed descriptions, and customer reviews. The website supports secure payment, fast delivery, and has many attractive promotions for parents and their beloved children.

      Your task is to answer customer questions and suggest products when they want to shop.

      ${chatHistoryText}
      Current user question: "${userDescription}"

      Available products list (JSON format):
      ${JSON.stringify(productsData, null, 2)}

      Analyze the user's content and perform one of the following tasks:

      1. If the user is searching for or wants to buy a product: Choose up to ${limit} most suitable products and return two parts:
         - A JSON array containing only the selected product IDs, for example: ["id1", "id2", "id3"]
         - A brief introduction text about why you're recommending these products (keep it short, 1-2 sentences only)

      2. If the user is only asking for information or having a general conversation: Just answer the question in a friendly and helpful way.

      Note: Don't include both parts unless the user is both asking for information and looking for products.
      
      For Vietnamese users, please respond in Vietnamese language.
      
      IMPORTANT: When recommending products, DO NOT include product names or descriptions in your introduction text. Just provide a general introduction like "Dựa trên yêu cầu của bạn, tôi xin gợi ý những sản phẩm sau:" or "Tôi đã tìm thấy một số sản phẩm phù hợp với nhu cầu của bạn:". The product details will be displayed separately.
      `;

      // Call Google Generative AI API
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to extract JSON array from the response
      let recommendedIds: string[] = [];
      let isProductRecommendation = false;
      let introText = '';

      try {
        // Find JSON array in response
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
          recommendedIds = JSON.parse(jsonMatch[0]);
          isProductRecommendation = true;

          // Extract the introduction text (everything before the JSON array)
          const beforeJson = text.split(jsonMatch[0])[0].trim();
          introText = beforeJson;
        }
      } catch (error) {
        this.logger.error(`Error parsing AI response: ${error.message}`);
        this.logger.debug(`AI response: ${text}`);

        const idMatches = text.match(/"([a-f\d]{24})"/g);
        if (idMatches) {
          recommendedIds = idMatches.map((id) => id.replace(/"/g, ''));
          isProductRecommendation = true;
        }
      }

      // If no product IDs found, treat as a chat response
      if (recommendedIds.length === 0) {
        return {
          success: true,
          message: 'Chat response generated',
          isProductRecommendation: false,
          responseText: text,
          items: [],
        };
      }

      // If we have product IDs, fetch the products
      const recommendedProducts = await this.productModel
        .find({
          _id: { $in: recommendedIds.map((id) => new Types.ObjectId(id)) },
          isActive: true,
        })
        .populate('primaryCategoryId', 'name slug')
        .populate('brandId', 'name slug')
        .select('name slug images variants originalPrice averageRating reviewCount');

      // Format return results
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

      // Clean up the intro text - remove any product IDs or markdown formatting
      let cleanIntroText = introText;
      // Remove any product IDs that might be in the text
      cleanIntroText = cleanIntroText.replace(/\b[a-f\d]{24}\b/g, '');
      // Remove markdown formatting like ** or *
      cleanIntroText = cleanIntroText.replace(/\*\*/g, '').replace(/\*/g, '');
      // Remove any bullet points or numbering
      cleanIntroText = cleanIntroText.replace(/^\s*[-*•]\s*/gm, '').replace(/^\s*\d+\.\s*/gm, '');
      // Remove any JSON syntax that might have leaked
      cleanIntroText = cleanIntroText.replace(/```json/g, '').replace(/```/g, '');

      return {
        success: true,
        message: isProductRecommendation ? 'Products recommended successfully' : 'Chat response generated',
        isProductRecommendation,
        items: products,
        responseText: cleanIntroText || 'Dựa trên yêu cầu của bạn, tôi xin gợi ý những sản phẩm sau:',
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
        responseText: 'Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu của bạn.',
      };
    }
  }
}
