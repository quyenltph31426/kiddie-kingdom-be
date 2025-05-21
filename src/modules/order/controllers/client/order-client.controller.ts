import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { OrderService } from '../../services/order.service';
import { CreateOrderDto } from '../../dto/create-order.dto';
import { UserAddressService } from '@/modules/user/services/user-address.service';
import { PaymentStatus, ShippingStatus } from '@/shared/enums';
import { CancelOrderDto } from '../../dto/cancel-order.dto';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class OrderClientController {
  constructor(
    private readonly orderService: OrderService,
    private readonly userAddressService: UserAddressService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Request() req): Promise<any> {
    return this.orderService.create(createOrderDto, req.user.sub);
  }

  @Get('shipping-address/default')
  @ApiOperation({ summary: 'Get default shipping address for order' })
  async getDefaultShippingAddress(@Request() req) {
    const defaultAddress = await this.userAddressService.getDefaultAddress(req.user.sub);
    if (!defaultAddress) {
      return null;
    }

    // Transform user address to shipping address format
    return {
      fullName: defaultAddress.fullName,
      phone: defaultAddress.phone,
      addressLine1: defaultAddress.addressLine1,
      addressLine2: defaultAddress.addressLine2,
      city: defaultAddress.city,
      district: defaultAddress.district,
      ward: defaultAddress.ward,
      postalCode: defaultAddress.postalCode,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'paymentStatus', required: false, enum: Object.values(PaymentStatus) })
  @ApiQuery({ name: 'shippingStatus', required: false, enum: Object.values(ShippingStatus) })
  findAll(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('shippingStatus') shippingStatus?: string,
  ) {
    return this.orderService.findUserOrders(req.user.sub, {
      page,
      limit,
      paymentStatus,
      shippingStatus,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.orderService.getOrderDetails(id, req.user.sub);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  async cancelOrder(@Param('id') id: string, @Body() cancelOrderDto: CancelOrderDto, @Request() req): Promise<any> {
    return this.orderService.cancelCashOnDeliveryOrder(id, req.user.sub, cancelOrderDto.reason);
  }
}
