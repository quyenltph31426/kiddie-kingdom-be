import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDate } from 'class-validator';
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
}
