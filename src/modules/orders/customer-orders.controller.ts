import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderSwapService } from './order-swap.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { CancelOrderDto, RespondSwapDto } from './dto/orders.dto';

@Controller('orders')
export class CustomerOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly swaps: OrderSwapService,
  ) {}

  @Get()
  list(@Actor() actor: ActorContext) {
    return this.orders.listCustomerOrders(actor);
  }

  @Get(':id')
  get(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.orders.getOrder(id, actor);
  }

  @Put(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.customerCancel(id, actor, dto);
  }

  @Post(':id/items/swap-response')
  respondSwap(
    @Param('id') orderId: string,
    @Actor() actor: ActorContext,
    @Body() dto: RespondSwapDto,
  ) {
    return this.swaps.respondSwap(orderId, actor, dto);
  }
}
