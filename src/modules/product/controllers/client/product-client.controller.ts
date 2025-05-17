import { Controller, Get, Param, Query, Post, Body, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ProductClientService } from '../../services/product-client.service';
import { UpdateProductStatsDto } from '../../dto/update-product-stats.dto';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('Products')
@Controller('products')
@Public() // Make all endpoints public by default
export class ProductClientController {
  constructor(private readonly productClientService: ProductClientService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active products' })
  @Public()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'brandId', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'tags', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('tags') tags?: string[],
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const userId = req.user?.sub || null;

    // Parse numeric values safely
    const parsedPage = page ? parseInt(page, 10) || 1 : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) || 10 : undefined;

    // Use null for invalid numbers instead of NaN
    const parsedMinPrice = minPrice ? (isNaN(parseFloat(minPrice)) ? null : parseFloat(minPrice)) : undefined;
    const parsedMaxPrice = maxPrice ? (isNaN(parseFloat(maxPrice)) ? null : parseFloat(maxPrice)) : undefined;

    // If either price is invalid, throw an error
    if (parsedMinPrice === null) {
      throw new BadRequestException('minPrice must be a valid number');
    }

    if (parsedMaxPrice === null) {
      throw new BadRequestException('maxPrice must be a valid number');
    }

    return this.productClientService.findAll({
      page: parsedPage,
      limit: parsedLimit,
      search,
      categoryId,
      brandId,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
      tags,
      sortBy,
      sortOrder,
      userId,
    });
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiBearerAuth() // Optional auth
  getFeatured(@Request() req, @Query('limit') limit: number = 10) {
    const userId = req.user?.sub || null;
    return this.productClientService.getFeaturedProducts(limit, userId);
  }

  @Get('best-sellers')
  @ApiOperation({ summary: 'Get best seller products' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiBearerAuth() // Optional auth
  getBestSellers(@Request() req, @Query('limit') limit: number = 10, @Query('page') page: number = 1) {
    const userId = req.user?.sub || null;
    return this.productClientService.getBestSellerProducts(limit, page, userId);
  }

  @Get('new-arrivals')
  @ApiOperation({ summary: 'Get new arrival products' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiBearerAuth() // Optional auth
  getNewArrivals(@Request() req, @Query('limit') limit: number = 10, @Query('page') page: number = 1) {
    const userId = req.user?.sub || null;
    return this.productClientService.getNewArrivalProducts(limit, page, userId);
  }

  @Get('on-sale')
  @ApiOperation({ summary: 'Get on sale products' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiBearerAuth() // Optional auth
  getOnSale(@Request() req, @Query('limit') limit: number = 10, @Query('page') page: number = 1) {
    const userId = req.user?.sub || null;
    return this.productClientService.getOnSaleProducts(limit, page, userId);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get product by ID or slug' })
  @ApiBearerAuth() // Optional auth
  findOne(@Request() req, @Param('idOrSlug') idOrSlug: string) {
    const userId = req.user?.sub || null;
    return this.productClientService.findOne(idOrSlug, userId);
  }

  @Get(':id/related')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiOperation({ summary: 'Get related products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiBearerAuth() // Optional auth
  getRelated(@Request() req, @Param('id') id: string, @Query('limit') limit: string, @Query('page') page: string) {
    const userId = req.user?.sub || null;
    const parsedPage = page ? parseInt(page, 10) || 1 : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) || 10 : undefined;
    return this.productClientService.getRelatedProducts(id, parsedLimit, parsedPage, userId);
  }

  @Post(':id/stats')
  @ApiOperation({ summary: 'Update product statistics (client)' })
  updateStats(@Param('id') id: string, @Body() statsDto: UpdateProductStatsDto) {
    return this.productClientService.incrementProductStats(id, statsDto);
  }
}
