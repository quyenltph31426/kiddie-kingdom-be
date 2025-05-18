import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { VoucherService } from '../../services/voucher.service';
import { CreateVoucherDto } from '../../dto/create-voucher.dto';
import { UpdateVoucherDto } from '../../dto/update-voucher.dto';
import { AdminAuthGuard } from '@/modules/admin-auth/guards/admin-auth.guard';
import { AdminRolesAllowed } from '@/shared/decorator/adminRoles.decorator';
import { AdminRoles } from '@/shared/enums';
import { VoucherStatus } from '@/database/schemas/voucher.schema';

@ApiTags('Admin Vouchers')
@Controller('admin/vouchers')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class VoucherAdminController {
  constructor(private readonly voucherService: VoucherService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new voucher' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  create(@Body() createVoucherDto: CreateVoucherDto) {
    return this.voucherService.create(createVoucherDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vouchers (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: VoucherStatus })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: VoucherStatus,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.voucherService.findAll({
      page,
      limit,
      search,
      status,
      isActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a voucher by ID (admin)' })
  findOne(@Param('id') id: string) {
    return this.voucherService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a voucher' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  update(@Param('id') id: string, @Body() updateVoucherDto: UpdateVoucherDto) {
    return this.voucherService.update(id, updateVoucherDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a voucher' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.voucherService.remove(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get voucher by code (admin)' })
  @ApiParam({ name: 'code', description: 'Voucher code' })
  findByCode(@Param('code') code: string) {
    return this.voucherService.findByCode(code);
  }
}
