import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { ProductReviewService } from '../../services/product-review.service';
import { CreateProductReviewDto } from '../../dto/create-product-review.dto';
import { UpdateProductReviewDto } from '../../dto/update-product-review.dto';

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
  @ApiOperation({ summary: 'Get product reviews' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('productId') productId?: string,
    @Query('rating') rating?: number,
  ) {
    return this.reviewService.findAll({
      page,
      limit,
      productId,
      rating,
      isActive: true,
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
    });
  }

  @Get('reviewable-products')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get products that user can review' })
  getReviewableProducts(@Request() req) {
    return this.reviewService.getUserReviewableProducts(req.user.sub);
  }

  @Get(':id')
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
