import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { RequireRole } from '../../auth/casl/policies.guard';

@ApiTags('Orders — Admin')
@ApiCookieAuth('session')
@RequireRole('admin')
@Controller('a/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'List all platform orders',
    description:
      'Returns orders across every vendor, newest first (capped at 200). Filter by status to monitor specific workflow stages.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    example: 'pending',
    description:
      'Filter by order status: pending | confirmed | preparing | ready_for_pickup | out_for_delivery | delivered | completed | cancelled | refunded',
  })
  @ApiResponse({ status: 200, description: 'Array of orders' })
  list(@Query('status') status?: string) {
    return this.orders.listAllOrders(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail (admin)' })
  @ApiParam({ name: 'id', example: 'order_01abc' })
  @ApiResponse({ status: 200, description: 'Order detail' })
  get(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.orders.getOrder(id, actor);
  }
}
