import { IsArray, ValidateNested, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CartItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Quantity', minimum: 1, maximum: 1000 })
  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity: number;

  @ApiPropertyOptional({ description: 'Variant ID (if applicable)' })
  @IsOptional()
  @IsString()
  variantId?: string;
}

export class MergeCartDto {
  @ApiProperty({
    description: 'Guest cart items to merge with user cart',
    type: [CartItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
