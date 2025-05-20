import { Controller, Post, Body, Get, Query, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductRecommendationService } from '../services/product-recommendation.service';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

class RecommendationRequestDto {
  @ApiProperty({
    description: 'User description',
    example: 'Tôi đang tìm một món quà cho bé trai 5 tuổi thích khủng long và lego',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Number of recommended products to return',
    example: 5,
  })
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Previous chat history (array of messages)',
    example: ['Tôi muốn tìm đồ chơi cho bé 5 tuổi', 'Bạn có thể cho biết bé thích gì không?'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  chatHistory?: string[];
}

@ApiTags('Recommendations')
@Controller('ai-agent')
export class ProductRecommendationController {
  constructor(private readonly recommendationService: ProductRecommendationService) {}

  @Post('')
  @Public()
  @ApiOperation({ summary: 'Get product recommendations based on user description' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: {
          type: 'string',
          example: 'Tôi đang tìm một món quà cho bé trai 5 tuổi thích khủng long và lego',
        },
        limit: {
          type: 'number',
          example: 5,
        },
        chatHistory: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: ['Tôi muốn tìm đồ chơi cho bé 5 tuổi', 'Bạn có thể cho biết bé thích gì không?'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns recommended products based on user description',
  })
  async getRecommendedProducts(@Body() requestDto: RecommendationRequestDto) {
    return this.recommendationService.getRecommendedProducts(
      requestDto.prompt,
      requestDto.limit || 5,
      requestDto.chatHistory || [],
    );
  }
}
