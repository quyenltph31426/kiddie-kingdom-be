import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { AdminRoles } from '@/shared/enums';
import { AdminRolesAllowed } from '@/shared/decorator/adminRoles.decorator';
import { AdminAuthGuard } from '@/modules/admin-auth/guards/admin-auth.guard';

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
}
