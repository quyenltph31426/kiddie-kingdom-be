import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsArray, IsOptional, Min, Max, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductReviewDto {
  @ApiProperty({
    description: 'Product ID',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @ApiProperty({
    description: 'Order ID',
    example: '60d21b4667d0d8992e610c86',
  })
  @IsNotEmpty()
  @IsMongoId()
  orderId: string;

  @ApiProperty({
    description: 'Rating (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @ApiProperty({
    description: 'Review comment',
    example: 'Great product, very satisfied with the quality!',
  })
  @IsNotEmpty()
  @IsString()
  comment: string;

  @ApiPropertyOptional({
    description: 'Review images',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
