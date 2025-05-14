import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CategoryService } from '../../services/category.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoryClientController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active categories' })
  @ApiQuery({ name: 'page', type: String, required: false })
  @ApiQuery({ name: 'limit', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10, @Query('search') search?: string) {
    return this.categoryService.findAll({ page, limit, search, isActive: true });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get active category by id' })
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id, { isActive: true });
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'Get products by category' })
  findProducts(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sort') sort?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.categoryService.findProducts(id, { page, limit, sort, order });
  }
}
