import { Module } from '@nestjs/common';
import { AdminReportsService } from './admin-reports.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminSettingsController } from '../platform-settings/admin-settings.controller';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { RecommendationsCron } from '../scheduling/recommendations.cron';

@Module({
  imports: [PlatformSettingsModule],
  providers: [AdminReportsService, RecommendationsCron],
  controllers: [AdminDashboardController, AdminSettingsController],
})
export class AdminModule {}
