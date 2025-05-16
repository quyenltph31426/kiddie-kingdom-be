import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsDate,
  IsBoolean,
  IsOptional,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherType } from '@/database/schemas/voucher.schema';

export class CreateVoucherDto {
  @ApiProperty({
    description: 'Voucher code',
    example: 'SUMMER2023',
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Voucher name',
    example: 'Summer Sale 2023',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Voucher description',
    example: 'Get 20% off on all summer products',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Voucher type',
    enum: VoucherType,
    example: VoucherType.PERCENTAGE,
  })
  @IsNotEmpty()
  @IsEnum(VoucherType)
  type: VoucherType;

  @ApiProperty({
    description: 'Voucher value (percentage or fixed amount)',
    example: 20,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value: number;

  @ApiPropertyOptional({
    description: 'Minimum order value to apply voucher',
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minOrderValue?: number;

  @ApiPropertyOptional({
    description: 'Maximum discount value (for percentage vouchers)',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxDiscountValue?: number;

  @ApiProperty({
    description: 'Maximum number of times the voucher can be used (0 = unlimited)',
    example: 100,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  usageLimit: number;

  @ApiProperty({
    description: 'Start date of the voucher',
    example: '2023-06-01T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date of the voucher',
    example: '2023-08-31T23:59:59.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Is voucher active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
