import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService, CollectPaymentDto } from './payments.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';

@ApiTags('Payments')
@ApiCookieAuth('session')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('collect')
  @ApiOperation({
    summary: 'Initiate a mobile money payment',
    description:
      'Triggers a mobile money push payment via Relworx. The customer receives a prompt on their phone to approve.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment initiated — poll /payments/:id/status for result',
  })
  @ApiResponse({ status: 400, description: 'Invalid phone number or amount' })
  collect(@Actor() actor: ActorContext, @Body() dto: CollectPaymentDto) {
    return this.service.collect(actor, dto);
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Poll payment status',
    description:
      'Returns the current status of a mobile money payment: pending | success | failed.',
  })
  @ApiParam({ name: 'id', example: 'pay_01abc' })
  @ApiResponse({ status: 200, description: 'Payment status object' })
  status(@Param('id') id: string) {
    return this.service.getStatus(id);
  }
}
