import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { AdminRoles } from '@/shared/enums';
import { AdminRolesAllowed } from '@/shared/decorator/adminRoles.decorator';
import { AdminAuthGuard } from '@/modules/admin-auth/guards/admin-auth.guard';
import { RevenueInterval, RevenueStatsDto } from '../dto/revenue-stats.dto';

@ApiTags('Dashboard')
@Controller('admin/dashboard')
// @UseGuards(AdminAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year'], required: false })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  getStats(@Query('period') period: string) {
    return this.dashboardService.getStats(period);
  }

  @Get('detailed-stats')
  @ApiOperation({ summary: 'Get detailed dashboard statistics' })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  getDetailedStats() {
    return this.dashboardService.getDetailedStats();
  }

  @Get('revenue-stats')
  @ApiOperation({ summary: 'Get revenue statistics by interval' })
  @ApiQuery({ name: 'interval', enum: RevenueInterval, required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'productIds', required: false })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  getRevenueStats(@Query() revenueStatsDto: RevenueStatsDto) {
    return this.dashboardService.getRevenueStats(revenueStatsDto);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of products to return' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year'], required: false })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  getTopProducts(@Query('limit') limit?: string, @Query('period') period?: string) {
    return this.dashboardService.getTopSellingProducts(limit, period);
  }

  @Get('top-customers')
  @ApiOperation({ summary: 'Get top customers by spending' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of customers to return' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year'], required: false })
  @AdminRolesAllowed(AdminRoles.ADMIN)
  getTopCustomers(@Query('limit') limit?: string, @Query('period') period?: string) {
    return this.dashboardService.getTopCustomers(limit, period);
  }
}
