import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderSwapService } from './order-swap.service';
import { VendorOrdersController } from './vendor-orders.controller';
import { CustomerOrdersController } from './customer-orders.controller';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { OrderSweepsCron } from '../scheduling/order-sweeps.cron';

@Module({
  imports: [PlatformSettingsModule],
  providers: [OrdersService, OrderSwapService, OrderSweepsCron],
  controllers: [VendorOrdersController, CustomerOrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
