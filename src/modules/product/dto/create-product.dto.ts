import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDate,
  ValidateNested,
  IsMongoId,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

class ProductVariantDto {
  @ApiProperty({ example: 'SKU123' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 29.99 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 19.99 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  soldCount?: number;

  @ApiPropertyOptional({ example: { color: 'Red', size: 'Large' } })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, string>;
}

export class CreateProductDto {
  @ApiProperty({ example: 'LEGO Star Wars Millennium Falcon' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Build the iconic Corellian freighter from Star Wars' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ['https://example.com/product1.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ example: ['60c72b2f9b44a52b88d56789'] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  categories?: Types.ObjectId[];

  @ApiPropertyOptional({ example: '60c72b2f9b44a52b88d56789' })
  @IsMongoId()
  @IsOptional()
  primaryCategoryId?: Types.ObjectId;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  originalPrice: number;

  @ApiPropertyOptional({ example: '60c72b2f9b44a52b88d56789' })
  @IsMongoId()
  @IsOptional()
  brandId?: Types.ObjectId;

  @ApiProperty({ type: [ProductVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants: ProductVariantDto[];

  @ApiPropertyOptional({ example: ['star wars', 'building blocks', 'collector'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    example: {
      Pieces: '7541',
      Age: '16+',
      Dimensions: '33cm x 22cm x 8cm',
    },
  })
  @IsObject()
  @IsOptional()
  specifications?: Record<string, string>;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isOnSale?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isNewArrival?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isBestSeller?: boolean;
}
