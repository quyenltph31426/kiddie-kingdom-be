import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductFavoriteService } from '../services/product-favorite.service';
import { ToggleFavoriteDto } from '../dto/toggle-favorite.dto';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';

@ApiTags('Product Favorites')
@Controller('favorites')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ProductFavoriteController {
  constructor(private readonly favoriteService: ProductFavoriteService) {}

  @Post('toggle')
  @ApiOperation({ summary: 'Toggle product favorite status' })
  toggleFavorite(@Request() req, @Body() toggleFavoriteDto: ToggleFavoriteDto) {
    return this.favoriteService.toggleFavorite(req.user.sub, toggleFavoriteDto.productId.toString());
  }

  @Get()
  @ApiOperation({ summary: 'Get user favorite products' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getFavorites(@Request() req, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.favoriteService.getFavorites(req.user.sub, page, limit);
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if a product is favorited by the user' })
  checkFavorite(@Request() req, @Param('productId') productId: string) {
    return this.favoriteService.checkFavoriteStatus(req.user.sub, productId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a product from favorites' })
  removeFavorite(@Request() req, @Param('id') id: string) {
    return this.favoriteService.removeFavorite(req.user.sub, id);
  }
}
