import { Module } from '@nestjs/common';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionService } from './subscription.service';
import {
  PublicPlansController,
  VendorPlansController,
  SubscriptionsController,
} from './subscriptions.controller';
import { CountersModule } from '../../common/counters/counters.module';
import { SubscriptionCycleCron } from '../scheduling/subscription-cycle.cron';

@Module({
  imports: [CountersModule],
  providers: [
    SubscriptionPlanService,
    SubscriptionService,
    SubscriptionCycleCron,
  ],
  controllers: [
    PublicPlansController,
    VendorPlansController,
    SubscriptionsController,
  ],
  exports: [SubscriptionService],
})
export class SubscriptionsModule {}
