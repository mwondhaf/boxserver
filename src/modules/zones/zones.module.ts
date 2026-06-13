import { Module } from '@nestjs/common';
import { FareService } from './fare.service';
import { QuoteService } from './quote.service';
import { QuotesController, AdminZonesController } from './zones.controller';

@Module({
  providers: [FareService, QuoteService],
  controllers: [QuotesController, AdminZonesController],
  exports: [FareService, QuoteService],
})
export class ZonesModule {}
