import { Controller, Get, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from '../services/search.service';
import { SearchQueryDto } from '../dto/search-query.dto';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  @ApiBearerAuth() // Optional auth
  @ApiOperation({ summary: 'Search products, categories, and brands' })
  async search(@Query() searchDto: SearchQueryDto, @Request() req) {
    const userId = req.user?.sub || null;
    return this.searchService.search(searchDto, userId);
  }
}
