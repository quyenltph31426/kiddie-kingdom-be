import { Controller, Get, Patch, Param, Delete, Query, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminAuthGuard } from '@/modules/admin-auth/guards/admin-auth.guard';
import { AdminRolesAllowed } from '@/shared/decorator/adminRoles.decorator';
import { AdminRoles, PAYMENT_METHOD, PaymentStatus, ShippingStatus } from '@/shared/enums';
import { OrderAdminService } from '../../services/order-admin.service';
import { UpdateOrderDto } from '../../dto/update-order.dto';

@ApiTags('Admin Orders')
@Controller('admin/orders')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class OrderAdminController {
  constructor(private readonly orderAdminService: OrderAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get all orders (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'paymentStatus', required: false, enum: Object.values(PaymentStatus) })
  @ApiQuery({ name: 'shippingStatus', required: false, enum: Object.values(ShippingStatus) })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: Object.values(PAYMENT_METHOD) })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('shippingStatus') shippingStatus?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.orderAdminService.findAll({
      page,
      limit,
      search,
      paymentStatus,
      shippingStatus,
      paymentMethod,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details (admin)' })
  findOne(@Param('id') id: string) {
    return this.orderAdminService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order status (admin)' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.orderAdminService.update(id, updateOrderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an order (admin)' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.orderAdminService.remove(id);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get order statistics' })
  getOrderStats(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.orderAdminService.getOrderStats(startDate, endDate);
  }

  @Get('payment/history')
  @ApiOperation({ summary: 'Get payment history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] })
  getPaymentHistory(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    return this.orderAdminService.getPaymentHistory({ page, limit, status });
  }
}
