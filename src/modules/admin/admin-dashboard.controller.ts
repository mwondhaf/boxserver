import { Controller, Get, Query } from '@nestjs/common';
import { AdminReportsService } from './admin-reports.service';
import { RequireRole } from '../../auth/ability/policies.guard';

@RequireRole('admin')
@Controller('a/reports')
export class AdminDashboardController {
  constructor(private readonly reports: AdminReportsService) {}

  @Get('dashboard')
  dashboard() {
    return this.reports.getDashboardSummary();
  }

  @Get('orders')
  orders(@Query('days') days?: string) {
    return this.reports.getOrderStats(days ? Number(days) : 7);
  }

  @Get('vendors')
  vendors() {
    return this.reports.getVendorStats();
  }

  @Get('riders')
  riders() {
    return this.reports.getRiderStats();
  }
}
