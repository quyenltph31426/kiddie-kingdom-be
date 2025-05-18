import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { ProductReviewService } from '../../services/product-review.service';
import { CreateProductReviewDto } from '../../dto/create-product-review.dto';
import { UpdateProductReviewDto } from '../../dto/update-product-review.dto';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('Product Reviews')
@Controller('reviews')
export class ProductReviewClientController {
  constructor(private readonly reviewService: ProductReviewService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product review' })
  create(@Request() req, @Body() createReviewDto: CreateProductReviewDto) {
    return this.reviewService.create(req.user.sub, createReviewDto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get product reviews (deprecated, use /product/:productId instead)',
    deprecated: true,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'productId', required: true, type: String })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('productId') productId?: string,
    @Query('rating') rating?: number,
  ) {
    if (!productId) {
      throw new BadRequestException('Product ID is required');
    }

    return this.reviewService.getProductReviews(productId, {
      page,
      limit,
      rating,
    });
  }

  @Get('my-reviews')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user reviews' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyReviews(@Request() req, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.reviewService.findAll({
      page,
      limit,
      userId: req.user.sub,
      isActive: true,
    });
  }

  @Get('reviewable-products')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get products that user can review' })
  getReviewableProducts(@Request() req) {
    return this.reviewService.getUserReviewableProducts(req.user.sub);
  }

  @Get('product/:productId')
  @Public()
  @ApiOperation({ summary: 'Get product reviews with rating statistics' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'rating', required: false, type: Number, description: 'Filter by rating (1-5)' })
  getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('rating') rating?: number,
  ) {
    return this.reviewService.getProductReviews(productId, {
      page,
      limit,
      rating,
    });
  }

  @Get('product/:productId/stats')
  @Public()
  @ApiOperation({ summary: 'Get product rating statistics' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  getProductRatingStats(@Param('productId') productId: string) {
    return this.reviewService.getProductRatingStats(productId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get review by ID' })
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user review' })
  update(@Param('id') id: string, @Request() req, @Body() updateReviewDto: UpdateProductReviewDto) {
    return this.reviewService.update(id, req.user.sub, updateReviewDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user review' })
  remove(@Param('id') id: string, @Request() req) {
    return this.reviewService.remove(id, req.user.sub);
  }
}
