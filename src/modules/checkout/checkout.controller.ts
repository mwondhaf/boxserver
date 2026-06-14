import { Body, Controller, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { PlaceOrderDto, QuoteDto } from './dto/checkout.dto';

@ApiTags('Checkout')
@ApiCookieAuth('session')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}

  @Post('quote')
  @ApiOperation({
    summary: 'Get order quote',
    description: 'Calculates the total cost of an order including item subtotal, delivery fee, and any promotion discounts — without placing the order. Use this to show the customer a final price before they confirm.',
  })
  @ApiResponse({ status: 201, description: 'Quote object with subtotal, deliveryFee, discount, and total' })
  @ApiResponse({ status: 400, description: 'Invalid cart, address, or promotion code' })
  quote(@Actor() actor: ActorContext, @Body() dto: QuoteDto) {
    return this.service.quote(actor, dto);
  }

  @Post('place')
  @ApiOperation({
    summary: 'Place an order',
    description: 'Creates the order, reserves stock, initiates payment (if mobile_money), and notifies the vendor. The cart is cleared after a successful order.',
  })
  @ApiResponse({ status: 201, description: 'Created order object' })
  @ApiResponse({ status: 400, description: 'Invalid input or payment failure' })
  @ApiResponse({ status: 409, description: 'Stock unavailable' })
  placeOrder(@Actor() actor: ActorContext, @Body() dto: PlaceOrderDto) {
    return this.service.placeOrder(actor, dto);
  }
}
