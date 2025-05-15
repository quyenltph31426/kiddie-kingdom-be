import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { OrderService } from '../../services/order.service';
import { CreateOrderDto } from '../../dto/create-order.dto';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class OrderClientController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Request() req): Promise<any> {
    return this.orderService.create(createOrderDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['TO_PAY', 'COMPLETED', 'CANCELED', 'REFUND', 'EXPIRED'] })
  findAll(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    return this.orderService.findUserOrders(req.user.sub, { page, limit, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.orderService.findUserOrder(id, req.user.sub);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  cancelOrder(@Param('id') id: string, @Request() req) {
    return this.orderService.cancelOrder(id, req.user.sub);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Process payment for an order' })
  processPayment(@Param('id') id: string, @Request() req) {
    return this.orderService.processPayment(id, req.user.sub);
  }
}
