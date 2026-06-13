import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentsService, CollectPaymentDto } from './payments.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('collect')
  collect(@Actor() actor: ActorContext, @Body() dto: CollectPaymentDto) {
    return this.service.collect(actor, dto);
  }

  @Get(':id/status')
  status(@Param('id') id: string) {
    return this.service.getStatus(id);
  }
}
