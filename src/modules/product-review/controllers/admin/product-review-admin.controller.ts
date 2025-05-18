import { Controller, Get, Patch, Param, Delete, Query, UseGuards, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AdminAuthGuard } from '@/modules/admin-auth/guards/admin-auth.guard';
import { AdminRolesAllowed } from '@/shared/decorator/adminRoles.decorator';
import { AdminRoles } from '@/shared/enums';
import { ProductReviewService } from '../../services/product-review.service';
import { AdminUpdateReviewDto } from '../../dto/admin-update-review.dto';

@ApiTags('Admin Product Reviews')
@Controller('admin/reviews')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class ProductReviewAdminController {
  constructor(private readonly reviewService: ProductReviewService) {}

  @Get()
  @ApiOperation({ summary: 'Get all reviews (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('productId') productId?: string,
    @Query('userId') userId?: string,
    @Query('rating') rating?: number,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.reviewService.findAll({
      page,
      limit,
      productId,
      userId,
      rating,
      isActive,
    });
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get product reviews with stats (admin)' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('rating') rating?: number,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.reviewService.getProductReviewsAdmin(productId, {
      page,
      limit,
      rating,
      isActive,
    });
  }

  @Get('product/:productId/stats')
  @ApiOperation({ summary: 'Get product rating statistics (admin)' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  getProductRatingStats(@Param('productId') productId: string) {
    return this.reviewService.getProductRatingStats(productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review by ID (admin)' })
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update review status (admin)' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  update(@Param('id') id: string, @Body() updateDto: AdminUpdateReviewDto, @Request() req) {
    return this.reviewService.adminUpdate(id, req.user.sub, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete review (admin)' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.reviewService.adminRemove(id);
  }
}
