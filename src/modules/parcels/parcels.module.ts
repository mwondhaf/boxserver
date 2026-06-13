import { Module } from '@nestjs/common';
import { ParcelService } from './parcel.service';
import { ParcelsController } from './parcels.controller';
import { ZonesModule } from '../zones/zones.module';
import { CountersModule } from '../../common/counters/counters.module';

@Module({
  imports: [ZonesModule, CountersModule],
  providers: [ParcelService],
  controllers: [ParcelsController],
  exports: [ParcelService],
})
export class ParcelsModule {}
