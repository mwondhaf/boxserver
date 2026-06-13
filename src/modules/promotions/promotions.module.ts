import { Module } from '@nestjs/common';
import { PromotionEngine } from './promotion-engine.service';
import {
  AdminPromotionsController,
  VendorPromotionsController,
} from './promotions.controller';

@Module({
  providers: [PromotionEngine],
  controllers: [AdminPromotionsController, VendorPromotionsController],
  exports: [PromotionEngine],
})
export class PromotionsModule {}
