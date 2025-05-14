import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@/shared/enums';

export class UpdateOrderDto {
  @ApiProperty({ description: 'Order status', enum: OrderStatus, required: false })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Tracking number', required: false })
  @IsString()
  @IsOptional()
  trackingNumber?: string;
}
