import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralsController } from './referrals.controller';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';

@Module({
  imports: [PlatformSettingsModule],
  providers: [ReferralService],
  controllers: [ReferralsController],
  exports: [ReferralService],
})
export class ReferralsModule {}
