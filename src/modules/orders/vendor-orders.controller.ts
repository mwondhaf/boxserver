import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderSwapService } from './order-swap.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import {
  CancelOrderDto,
  ConfirmOrderDto,
  MarkItemUnavailableDto,
  PickupCodeDto,
  ProposeSwapDto,
} from './dto/orders.dto';

@Controller('v/orders')
export class VendorOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly swaps: OrderSwapService,
  ) {}

  @Get()
  list(@Actor() actor: ActorContext, @Query('status') status?: string) {
    return this.orders.listVendorOrders(actor, status);
  }

  @Get(':id')
  get(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.orders.getOrder(id, actor);
  }

  @Put(':id/confirm')
  confirm(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: ConfirmOrderDto,
  ) {
    return this.orders.confirmOrder(id, actor, dto);
  }

  @Put(':id/prepare')
  prepare(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.orders.markPreparing(id, actor);
  }

  @Put(':id/ready')
  ready(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.orders.markReady(id, actor);
  }

  @Post(':id/pickup-code')
  verifyPickupCode(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: PickupCodeDto,
  ) {
    return this.orders.verifyPickupCode(id, actor, dto);
  }

  @Put(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.vendorCancel(id, actor, dto);
  }

  @Put(':id/items/unavailable')
  markUnavailable(
    @Param('id') orderId: string,
    @Actor() actor: ActorContext,
    @Body() dto: MarkItemUnavailableDto,
  ) {
    return this.swaps.markUnavailable(orderId, dto.orderItemId, actor);
  }

  @Post(':id/items/swap')
  proposeSwap(
    @Param('id') orderId: string,
    @Actor() actor: ActorContext,
    @Body() dto: ProposeSwapDto,
  ) {
    return this.swaps.proposeSwap(orderId, actor, dto);
  }
}
