import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BannerService } from '../../services/banner.service';
import { BannerType } from '@/database/schemas/banner.schema';

@ApiTags('Banners')
@Controller('banners')
export class BannerClientController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @ApiOperation({ summary: 'Get active banners' })
  @ApiQuery({ name: 'type', required: false, enum: BannerType })
  getActiveBanners(@Query('type') type?: BannerType) {
    return this.bannerService.getActiveBanners(type);
  }
}
