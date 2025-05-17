import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchType {
  ALL = 'all',
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  BRANDS = 'brands',
}

export class SearchQueryDto {
  @ApiProperty({
    description: 'Search query',
    example: 'phone',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Search type',
    enum: SearchType,
    default: SearchType.ALL,
  })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
