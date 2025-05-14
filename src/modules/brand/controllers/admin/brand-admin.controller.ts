import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BrandService } from '../../services/brand.service';
import { CreateBrandDto } from '../../dto/create-brand.dto';
import { UpdateBrandDto } from '../../dto/update-brand.dto';
import { AdminAuthGuard } from '@/modules/admin-auth/guards/admin-auth.guard';
import { AdminRolesAllowed } from '@/shared/decorator/adminRoles.decorator';
import { AdminRoles } from '@/shared/enums';

@ApiTags('Admin Brands')
@Controller('admin/brands')
// @UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class BrandAdminController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new brand' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  create(@Body() createBrandDto: CreateBrandDto) {
    return this.brandService.create(createBrandDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all brands (admin)' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
    @Query('isFeatured') isFeatured?: boolean,
  ) {
    return this.brandService.findAll({
      page,
      limit,
      search,
      isActive,
      isFeatured,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a brand by ID (admin)' })
  findOne(@Param('id') id: string) {
    return this.brandService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a brand' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  update(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
    return this.brandService.update(id, updateBrandDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a brand' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.brandService.remove(id);
  }

  @Patch(':id/featured')
  @ApiOperation({ summary: 'Toggle brand featured status' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  toggleFeatured(@Param('id') id: string, @Body() body: { isFeatured: boolean }) {
    return this.brandService.toggleFeatured(id, body.isFeatured);
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'Toggle brand active status' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  toggleActive(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.brandService.toggleActive(id, body.isActive);
  }
}
