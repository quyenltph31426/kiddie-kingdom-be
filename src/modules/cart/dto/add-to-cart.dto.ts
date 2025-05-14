import { IsNotEmpty, IsString, IsNumber, Min, Max, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'Product ID' })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Quantity', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  quantity: number;

  @ApiPropertyOptional({ description: 'Variant ID (if applicable)' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ description: 'Additional attributes (color, size, etc.)' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;
}
