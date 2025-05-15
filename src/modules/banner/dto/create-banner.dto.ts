import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsUrl } from 'class-validator';
import { BannerType } from '@/database/schemas/banner.schema';

export class CreateBannerDto {
  @ApiProperty({ example: 'Summer Sale' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Up to 50% off on all products' })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiProperty({ example: 'https://example.com/images/banner.jpg' })
  @IsString()
  @IsUrl()
  image: string;

  @ApiPropertyOptional({ example: '/products?sale=true' })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional({ enum: BannerType, example: BannerType.HOME_HERO })
  @IsEnum(BannerType)
  @IsOptional()
  type?: BannerType;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
