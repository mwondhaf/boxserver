import { Body, Controller, Post } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { PlaceOrderDto, QuoteDto } from './dto/checkout.dto';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}

  @Post('quote')
  quote(@Actor() actor: ActorContext, @Body() dto: QuoteDto) {
    return this.service.quote(actor, dto);
  }

  @Post('place')
  placeOrder(@Actor() actor: ActorContext, @Body() dto: PlaceOrderDto) {
    return this.service.placeOrder(actor, dto);
  }
}
