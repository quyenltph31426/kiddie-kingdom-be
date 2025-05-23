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
        .select(
          'name description tags brandName primaryCategoryId reviewCount totalSoldCount averageRating originalPrice',
        )
        .populate('brandId', 'name')
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

      const productsData = allProducts.map((product: any) => ({
        id: product._id.toString(),
        name: product.name,
        description: product.description || '',
        tags: product.tags || [],
        brandName: product.brandId?.name || '',
        categoryName: product.primaryCategoryId?.name || '',
        reviewCount: product.reviewCount || 0,
        totalSoldCount: product.totalSoldCount || 0,
        averageRating: product.averageRating || 0,
        originalPrice: product.originalPrice,
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
          You are a smart 🤖, friendly 😊, and supportive AI shopping assistant for **Kiddie Kingdom** – a magical 🏰 toy store 🎁 where creativity, learning, and joy come together to create unforgettable moments for children of all ages.

          ---

          🧸 Kiddie Kingdom is a colorful and creative toy store with a wide selection of safe, educational, and fun toys for kids of all ages.

          ---

          Your mission as AI shopping assistant:

          - Listen carefully to what the user wants.
          - Provide relevant product suggestions ONLY when user is explicitly asking for toy recommendations, comparisons, or purchase.
          - When user is just chatting, asking general questions, or browsing casually, respond with friendly, natural, and helpful conversation — no generic product suggestion phrases allowed.
          - Keep replies warm, clear, engaging, with emojis and line breaks.
          - Always respond fully in Vietnamese if user uses Vietnamese.

          ---

          Analyze the user's message and choose **EXACTLY ONE** of these two:

          ---

          🔹 CASE 1: User explicitly wants product recommendations, comparisons, or is ready to buy.

          - Select up to ${limit} products from the catalog matching all criteria.
          - Respond with EXACTLY TWO parts:
            1. JSON array of selected product IDs (e.g. ["id1", "id2"])
            2. A friendly message wrapped in <div>...</div> using one of these varied templates:
              - "🎉 Mình đã tìm được một số món đồ chơi rất phù hợp cho bé nhà bạn! 🧸"
              - "✨ Dưới đây là những lựa chọn tuyệt vời mà mình nghĩ bạn sẽ thích! 😊"
              - "🌟 Đây là một số sản phẩm rất hợp với yêu cầu của bạn, hy vọng bạn sẽ ưng ý! 🎁"
              - "🎈 Mình chọn được một vài món đồ chơi thú vị, bạn tham khảo nhé! 🧩"
              - "🎀 Những món đồ chơi này rất đáng yêu và phù hợp với nhu cầu của bạn! 💖"

          - The message:
            - Starts with <div> and ends with </div>
            - Only basic HTML tags (<p>, <ul>, <strong>, <br>, etc)
            - No markdown, no product names, no detailed descriptions.
            - Absolutely no generic phrases like "Dựa trên yêu cầu của bạn..."

          ---

          🔹 CASE 2: User is chatting casually, asking general questions, or browsing without asking for products.

          - Respond ONLY with a natural, friendly, and relevant HTML message wrapped in <div>...</div>.
          - Use emojis, varied sentence structures, and keep tone warm and conversational.
          - Do NOT mention product suggestions or shopping phrases.
          - For example:
            - "<div><p>Chào bạn! Mình có thể giúp gì cho bạn hôm nay? 😊</p><p>Nếu cần gợi ý đồ chơi hoặc muốn biết thêm thông tin, cứ hỏi nhé!</p></div>"
            - "<div><p>Đồ chơi tại Kiddie Kingdom rất đa dạng, bạn thích loại nào? Mình sẽ giúp bạn tìm hiểu!</p></div>"
            - "<div><p>Mình rất vui được giúp bạn! Hãy cho mình biết bạn cần gì nhé! 🧸</p></div>"

          - Absolutely no repetitive, robotic, or cứng nhắc câu trả lời.

          ---

          📝 Additional rules:

          - Respond entirely in Vietnamese if user speaks Vietnamese.
          - NEVER mix CASE 1 and CASE 2 responses.
          - Keep tone friendly, cheerful, and helpful.
          - Do not include code blocks or markdown in responses.

          ---

          🚫 FINAL RULE:

          - CASE 2 response must be strictly <div>...</div>, no markdown or code fences.
          - Violations cause response rejection.

          ---

          ${chatHistoryText}  
          Current user message: "${userDescription}"

          Product catalog (in JSON format):  
          ${JSON.stringify(productsData, null, 2)}
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
