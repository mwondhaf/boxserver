import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { PricingEngine } from './pricing-engine.service';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { CountersModule } from '../../common/counters/counters.module';
import { ZonesModule } from '../zones/zones.module';

@Module({
  imports: [PlatformSettingsModule, CountersModule, ZonesModule],
  providers: [CheckoutService, PricingEngine],
  controllers: [CheckoutController],
  exports: [CheckoutService, PricingEngine],
})
export class CheckoutModule {}
