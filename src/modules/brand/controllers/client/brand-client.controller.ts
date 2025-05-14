import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BrandService } from '../../services/brand.service';

@ApiTags('Brands')
@Controller('brands')
export class BrandClientController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active brands' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10, @Query('search') search?: string) {
    return this.brandService.findAll({
      page,
      limit,
      search,
      isActive: true,
    });
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured brands' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getFeatured(@Query('limit') limit: number = 10) {
    return this.brandService.getFeaturedBrands(limit);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get brand by ID or slug' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.brandService.findOne(idOrSlug, { isActive: true });
  }
}
