import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductAdminService } from '../../services/product-admin.service';
import { UpdateProductDto } from '../../dto/update-product.dto';
import { UpdateProductStatsDto } from '../../dto/update-product-stats.dto';
import { AdminAuthGuard } from '@/modules/admin-auth/guards/admin-auth.guard';
import { AdminRolesAllowed } from '@/shared/decorator/adminRoles.decorator';
import { AdminRoles } from '@/shared/enums';
import { CreateProductDto } from '../../dto/create-product.dto';

@ApiTags('Admin Products')
@Controller('admin/products')
// @UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class ProductAdminController {
  constructor(private readonly productAdminService: ProductAdminService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productAdminService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'brandId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'isOnSale', required: false, type: Boolean })
  @ApiQuery({ name: 'isNewArrival', required: false, type: Boolean })
  @ApiQuery({ name: 'isBestSeller', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('isActive') isActive?: boolean,
    @Query('isFeatured') isFeatured?: boolean,
    @Query('isOnSale') isOnSale?: boolean,
    @Query('isNewArrival') isNewArrival?: boolean,
    @Query('isBestSeller') isBestSeller?: boolean,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.productAdminService.findAll({
      page,
      limit,
      search,
      categoryId,
      brandId,
      isActive,
      isFeatured,
      isOnSale,
      isNewArrival,
      isBestSeller,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID (admin)' })
  findOne(@Param('id') id: string) {
    return this.productAdminService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productAdminService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.productAdminService.remove(id);
  }

  @Patch(':id/stats')
  @ApiOperation({ summary: 'Update product statistics' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  updateStats(@Param('id') id: string, @Body() statsDto: UpdateProductStatsDto) {
    return this.productAdminService.updateStats(id, statsDto);
  }

  @Patch(':id/toggle-featured')
  @ApiOperation({ summary: 'Toggle product featured status' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  toggleFeatured(@Param('id') id: string, @Body('isFeatured') isFeatured: boolean) {
    return this.productAdminService.toggleFeatured(id, isFeatured);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle product active status' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.productAdminService.toggleActive(id, isActive);
  }

  @Patch(':id/toggle-on-sale')
  @ApiOperation({ summary: 'Toggle product on sale status' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  toggleOnSale(@Param('id') id: string, @Body('isOnSale') isOnSale: boolean) {
    return this.productAdminService.toggleOnSale(id, isOnSale);
  }

  @Patch(':id/toggle-new-arrival')
  @ApiOperation({ summary: 'Toggle product new arrival status' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  toggleNewArrival(@Param('id') id: string, @Body('isNewArrival') isNewArrival: boolean) {
    return this.productAdminService.toggleNewArrival(id, isNewArrival);
  }

  @Patch(':id/toggle-best-seller')
  @ApiOperation({ summary: 'Toggle product best seller status' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  toggleBestSeller(@Param('id') id: string, @Body('isBestSeller') isBestSeller: boolean) {
    return this.productAdminService.toggleBestSeller(id, isBestSeller);
  }
}
