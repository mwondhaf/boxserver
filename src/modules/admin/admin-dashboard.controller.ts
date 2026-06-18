import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminReportsService } from './admin-reports.service';
import { RequireRole } from '../../auth/casl/policies.guard';

@ApiTags('Admin — Reports')
@ApiCookieAuth('session')
@RequireRole('admin')
@Controller('a/reports')
export class AdminDashboardController {
  constructor(private readonly reports: AdminReportsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard summary',
    description:
      'Returns high-level platform metrics: total orders, GMV, active vendors, active riders, and revenue.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard summary object' })
  dashboard() {
    return this.reports.getDashboardSummary();
  }

  @Get('orders')
  @ApiOperation({
    summary: 'Order statistics',
    description:
      'Returns order counts and revenue grouped by day for the last N days.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    example: '7',
    description: 'Number of days to look back (default: 7)',
  })
  @ApiResponse({ status: 200, description: 'Array of daily order stats' })
  orders(@Query('days') days?: string) {
    return this.reports.getOrderStats(days ? Number(days) : 7);
  }

  @Get('vendors')
  @ApiOperation({
    summary: 'Vendor statistics',
    description:
      'Returns vendor counts, top performers by GMV, and average order values.',
  })
  @ApiResponse({ status: 200, description: 'Vendor stats object' })
  vendors() {
    return this.reports.getVendorStats();
  }

  @Get('riders')
  @ApiOperation({
    summary: 'Rider statistics',
    description:
      'Returns rider counts by status, average delivery times, and top-rated riders.',
  })
  @ApiResponse({ status: 200, description: 'Rider stats object' })
  riders() {
    return this.reports.getRiderStats();
  }
}
