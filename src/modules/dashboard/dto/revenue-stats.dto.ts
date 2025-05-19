import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export enum RevenueInterval {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class RevenueStatsDto {
  @ApiProperty({ enum: RevenueInterval, default: RevenueInterval.MONTH })
  @IsEnum(RevenueInterval)
  @IsOptional()
  interval: RevenueInterval = RevenueInterval.MONTH;

  @ApiProperty({ required: false, description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false, description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false, description: 'Product IDs to filter' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  productIds?: string[];
}
