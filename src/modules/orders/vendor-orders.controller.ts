import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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

@ApiTags('Orders — Vendor')
@ApiCookieAuth('session')
@Controller('v/orders')
export class VendorOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly swaps: OrderSwapService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List vendor orders', description: 'Returns orders for the authenticated vendor\'s organisation. Filter by status to build workflow queues.' })
  @ApiQuery({ name: 'status', required: false, example: 'confirmed', description: 'Filter by order status: pending | confirmed | preparing | ready | delivered | cancelled' })
  @ApiResponse({ status: 200, description: 'Array of orders' })
  list(@Actor() actor: ActorContext, @Query('status') status?: string) {
    return this.orders.listVendorOrders(actor, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiParam({ name: 'id', example: 'order_01abc' })
  @ApiResponse({ status: 200, description: 'Order detail' })
  get(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.orders.getOrder(id, actor);
  }

  @Put(':id/confirm')
  @ApiOperation({ summary: 'Confirm an order', description: 'Vendor accepts the order and optionally sets an estimated preparation time. Triggers rider assignment.' })
  @ApiParam({ name: 'id', example: 'order_01abc' })
  @ApiResponse({ status: 200, description: 'Confirmed order' })
  confirm(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: ConfirmOrderDto,
  ) {
    return this.orders.confirmOrder(id, actor, dto);
  }

  @Put(':id/prepare')
  @ApiOperation({ summary: 'Mark order as being prepared', description: 'Updates order status to "preparing". Notifies the rider to get ready.' })
  @ApiParam({ name: 'id', example: 'order_01abc' })
  @ApiResponse({ status: 200, description: 'Order status updated to preparing' })
  prepare(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.orders.markPreparing(id, actor);
  }

  @Put(':id/ready')
  @ApiOperation({ summary: 'Mark order as ready for pickup', description: 'Updates order status to "ready". Notifies the assigned rider to come collect.' })
  @ApiParam({ name: 'id', example: 'order_01abc' })
  @ApiResponse({ status: 200, description: 'Order status updated to ready' })
  ready(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.orders.markReady(id, actor);
  }

  @Post(':id/pickup-code')
  @ApiOperation({ summary: 'Verify rider pickup code', description: 'Validates the 4-digit code the rider presents. Confirms handoff and transitions order to "in_transit".' })
  @ApiParam({ name: 'id', example: 'order_01abc' })
  @ApiResponse({ status: 201, description: 'Code verified, order handed off' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  verifyPickupCode(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: PickupCodeDto,
  ) {
    return this.orders.verifyPickupCode(id, actor, dto);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order (vendor)', description: 'Vendor cancels an order before it is dispatched.' })
  @ApiParam({ name: 'id', example: 'order_01abc' })
  @ApiResponse({ status: 200, description: 'Cancelled order' })
  cancel(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.vendorCancel(id, actor, dto);
  }

  @Put(':id/items/unavailable')
  @ApiOperation({ summary: 'Mark an order item as unavailable', description: 'Use when a specific item is out of stock. The customer is notified and can accept a swap or cancel.' })
  @ApiParam({ name: 'id', example: 'order_01abc' })
  @ApiResponse({ status: 200, description: 'Item marked unavailable' })
  markUnavailable(
    @Param('id') orderId: string,
    @Actor() actor: ActorContext,
    @Body() dto: MarkItemUnavailableDto,
  ) {
    return this.swaps.markUnavailable(orderId, dto.orderItemId, actor);
  }

  @Post(':id/items/swap')
  @ApiOperation({ summary: 'Propose an item swap', description: 'Suggests a substitute variant for an unavailable item. The customer must accept or reject via POST /orders/:id/items/swap-response.' })
  @ApiParam({ name: 'id', example: 'order_01abc' })
  @ApiResponse({ status: 201, description: 'Swap proposal sent to customer' })
  proposeSwap(
    @Param('id') orderId: string,
    @Actor() actor: ActorContext,
    @Body() dto: ProposeSwapDto,
  ) {
    return this.swaps.proposeSwap(orderId, actor, dto);
  }
}
