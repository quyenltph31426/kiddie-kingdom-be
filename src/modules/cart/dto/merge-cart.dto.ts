import { IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CartItemDto {
  productId: string;
  quantity: number;
  variantId?: string;
  attributes?: Record<string, string>;
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
