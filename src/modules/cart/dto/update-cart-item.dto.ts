import { IsNumber, Min, Max, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({ description: 'New quantity', minimum: 1, maximum: 1000 })
  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity: number;

  @ApiPropertyOptional({ description: 'Variant ID (if applicable)' })
  @IsOptional()
  @IsString()
  variantId?: string;
}
