import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDate, IsArray } from 'class-validator';
import { PaymentStatus, ShippingStatus } from '@/shared/enums';
import { Type } from 'class-transformer';

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: 'Payment status', enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'Shipping status', enum: ShippingStatus })
  @IsEnum(ShippingStatus)
  @IsOptional()
  shippingStatus?: string;

  @ApiPropertyOptional({ description: 'Tracking number' })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'Shipped date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  shippedAt?: Date;

  @ApiPropertyOptional({ description: 'Delivered date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  deliveredAt?: Date;

  @ApiPropertyOptional({ description: 'Note' })
  @IsString()
  @IsOptional()
  userNote?: string;

  @ApiPropertyOptional({ description: 'Shipper of proof' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  shipperOfProof?: string[];
}
