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
        You are a smart, friendly, and supportive AI shopping assistant for "Kiddie Kingdom" – a magical world of toys designed to bring joy, creativity, and safety to children of all ages. Kiddie Kingdom offers a wide selection of colorful, high-quality toys categorized into educational toys, building toys, stuffed animals, active play, and more. Each product includes vibrant images, clear descriptions, and customer reviews. The website also supports secure payments, fast delivery, and attractive promotions for parents and their little ones.

        Your role is to assist users like a real shopping assistant — by answering questions clearly, offering helpful guidance, and suggesting suitable products when appropriate. Whether the user is browsing, exploring options, or ready to buy, your job is to make their experience smooth, informative, and enjoyable.

        ${chatHistoryText}
        Current user message: "${userDescription}"

        Product catalog (in JSON format):
        ${JSON.stringify(productsData, null, 2)}

        Analyze the user's message and perform **exactly ONE** of the following actions based on their intent:

        ---

        🔹 CASE 1: The user is looking for products (e.g., shopping, asking for suggestions, comparing, ready to buy):
        - Select up to ${limit} relevant products from the catalog.
        - Return your answer in **exactly two parts only**:
          1. A JSON array of selected product IDs (e.g., ["id1", "id2", "id3"])
          2. A short friendly message (1–2 sentences), such as:
            - "Based on what you're looking for, here are a few products I think you'll love!"
            - "I've found some great options that match your needs!"

        ⚠️ DO NOT include any product names, descriptions, or extra commentary outside these two parts.
        ⚠️ DO NOT return HTML in this case.

        ---

        🔹 CASE 2: The user is asking a general question, browsing, or just chatting:
        - Respond ONLY with a single HTML block.
        - The response must be pure HTML and wrapped in one pair of <div> tags.
        - Use basic HTML tags like <p>, <ul>, <strong> for formatting.
        - ⚠️ DO NOT use markdown syntax like \`\`\` or \`\`\`html.
        - DO NOT include any explanation, formatting indicators, or content outside the HTML block.

        ✅ Example of a valid response:
        <div>
          <p>Hello! I'm here to help you find the perfect toys for your little one. Just let me know what you're looking for!</p>
        </div>

        ---

        📝 Additional guidelines:
        - If the user is Vietnamese, respond entirely in Vietnamese — including the HTML block if applicable.
        - NEVER include both product suggestions and an HTML block — always choose one action based on the message.
        - Maintain a warm, clear, and helpful tone — like a trusted shopping assistant at Kiddie Kingdom.
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
