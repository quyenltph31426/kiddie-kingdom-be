import { Controller, Post, Body, Get, Query, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ProductRecommendationService } from '../services/product-recommendation.service';
import { Public } from '@/modules/auth/decorators/public.decorator';

class RecommendationRequestDto {
  description: string;
  limit?: number;
}

@ApiTags('Recommendations')
@Controller('recommendations')
export class ProductRecommendationController {
  constructor(private readonly recommendationService: ProductRecommendationService) {}

  @Post('products/suggest')
  @Public()
  @ApiOperation({ summary: 'Get product recommendations based on user description' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['description'],
      properties: {
        description: {
          type: 'string',
          example: 'Tôi đang tìm một món quà cho bé trai 5 tuổi thích khủng long và lego',
        },
        limit: {
          type: 'number',
          example: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns recommended products based on user description',
  })
  async getRecommendedProducts(@Body(ValidationPipe) requestDto: RecommendationRequestDto) {
    return this.recommendationService.getRecommendedProducts(requestDto.description, requestDto.limit || 5);
  }

  @Get('products/suggest')
  @Public()
  @ApiOperation({ summary: 'Get product recommendations based on user description (GET method)' })
  @ApiResponse({
    status: 200,
    description: 'Returns recommended products based on user description',
  })
  async getRecommendedProductsGet(@Query('description') description: string, @Query('limit') limit?: number) {
    if (!description) {
      return {
        success: false,
        message: 'Description is required',
        items: [],
      };
    }
    return this.recommendationService.getRecommendedProducts(description, limit || 5);
  }
}
