import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { RelworxWebhookController } from './relworx-webhook.controller';
import { RelworxMomoClient } from './momo/relworx-momo.client';
import { MOMO_CLIENT } from './momo/momo-client';
import { PaymentSweepsCron } from '../scheduling/payment-sweeps.cron';

@Module({
  providers: [
    { provide: MOMO_CLIENT, useClass: RelworxMomoClient },
    PaymentsService,
    PaymentSweepsCron,
  ],
  controllers: [PaymentsController, RelworxWebhookController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
