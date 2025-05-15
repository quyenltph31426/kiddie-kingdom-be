import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BannerService } from '../../services/banner.service';
import { CreateBannerDto } from '../../dto/create-banner.dto';
import { UpdateBannerDto } from '../../dto/update-banner.dto';
import { AdminAuthGuard } from '@/modules/admin-auth/guards/admin-auth.guard';
import { AdminRolesAllowed } from '@/shared/decorator/adminRoles.decorator';
import { AdminRoles } from '@/shared/enums';
import { BannerType } from '@/database/schemas/banner.schema';

@ApiTags('Admin Banners')
@Controller('admin/banners')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class BannerAdminController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new banner' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  create(@Body() createBannerDto: CreateBannerDto) {
    return this.bannerService.create(createBannerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all banners (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: BannerType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: BannerType,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.bannerService.findAll({
      page,
      limit,
      type,
      isActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get banner by ID' })
  findOne(@Param('id') id: string) {
    return this.bannerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update banner' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  update(@Param('id') id: string, @Body() updateBannerDto: UpdateBannerDto) {
    return this.bannerService.update(id, updateBannerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete banner' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.bannerService.remove(id);
  }
}
