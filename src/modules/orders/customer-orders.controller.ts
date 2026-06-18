import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderSwapService } from './order-swap.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { CancelOrderDto, RespondSwapDto } from './dto/orders.dto';

@ApiTags('Orders — Customer')
@ApiCookieAuth('session')
@Controller('orders')
export class CustomerOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly swaps: OrderSwapService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List my orders',
    description:
      'Returns all orders placed by the authenticated customer, newest first.',
  })
  @ApiResponse({ status: 200, description: 'Array of orders' })
  list(@Actor() actor: ActorContext) {
    return this.orders.listCustomerOrders(actor);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order detail',
    description:
      'Returns full order with items, status history, and delivery info.',
  })
  @ApiParam({ name: 'id', example: 'order_01abc' })
  @ApiResponse({ status: 200, description: 'Order detail' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  get(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.orders.getOrder(id, actor);
  }

  @Put(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an order',
    description:
      'Customer can cancel an order while it is still in pending or confirmed state.',
  })
  @ApiParam({ name: 'id', example: 'order_01abc' })
  @ApiResponse({ status: 200, description: 'Cancelled order' })
  @ApiResponse({
    status: 400,
    description: 'Order cannot be cancelled at this stage',
  })
  cancel(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.customerCancel(id, actor, dto);
  }

  @Post(':id/items/swap-response')
  @ApiOperation({
    summary: 'Respond to a vendor item swap proposal',
    description:
      'When a vendor marks an item unavailable and proposes a substitute, the customer can accept or reject it here.',
  })
  @ApiParam({ name: 'id', example: 'order_01abc' })
  @ApiResponse({ status: 200, description: 'Updated order item' })
  respondSwap(
    @Param('id') orderId: string,
    @Actor() actor: ActorContext,
    @Body() dto: RespondSwapDto,
  ) {
    return this.swaps.respondSwap(orderId, actor, dto);
  }
}
