import { Module } from '@nestjs/common';
import { RiderService } from './rider.service';
import { RiderController } from './rider.controller';
import { AdminRidersController } from './admin-riders.controller';
import { StagesController } from './stages.controller';
import { CountersModule } from '../../common/counters/counters.module';

@Module({
  imports: [CountersModule],
  providers: [RiderService],
  controllers: [RiderController, AdminRidersController, StagesController],
  exports: [RiderService],
})
export class RidersModule {}
