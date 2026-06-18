import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { IsOptional, IsString } from 'class-validator';

class PickupConfirmDto {
  @ApiProperty({
    example: '4821',
    description: 'Pickup code displayed by the vendor',
  })
  @IsString()
  code!: string;
}

class DeliveryConfirmDto {
  @ApiPropertyOptional({
    example: 'deliveries/order_01abc/proof.jpg',
    description: 'R2 storage key of the delivery proof photo (optional)',
  })
  @IsString()
  @IsOptional()
  proofR2Key?: string;
}

@ApiTags('Dispatch — Rider')
@ApiCookieAuth('session')
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly service: DispatchService) {}

  @Post(':orderId/accept')
  @ApiOperation({
    summary: 'Accept a delivery',
    description:
      'Rider claims the delivery for this order. The order must be in "ready" state.',
  })
  @ApiParam({ name: 'orderId', example: 'order_01abc' })
  @ApiResponse({ status: 201, description: 'Delivery accepted' })
  @ApiResponse({
    status: 409,
    description: 'Order already claimed by another rider',
  })
  accept(@Param('orderId') orderId: string, @Actor() actor: ActorContext) {
    return this.service.acceptDelivery(orderId, actor);
  }

  @Post(':orderId/pickup')
  @ApiOperation({
    summary: 'Confirm order pickup',
    description:
      'Rider enters the 4-digit code given by the vendor to confirm they have collected the order.',
  })
  @ApiParam({ name: 'orderId', example: 'order_01abc' })
  @ApiResponse({
    status: 201,
    description: 'Pickup confirmed, order status set to in_transit',
  })
  @ApiResponse({ status: 400, description: 'Invalid pickup code' })
  confirmPickup(
    @Param('orderId') orderId: string,
    @Actor() actor: ActorContext,
    @Body() dto: PickupConfirmDto,
  ) {
    return this.service.confirmPickup(orderId, actor, dto.code);
  }

  @Post(':orderId/deliver')
  @ApiOperation({
    summary: 'Confirm delivery completion',
    description:
      'Marks the order as delivered. Optionally attach a proof-of-delivery photo via its R2 storage key.',
  })
  @ApiParam({ name: 'orderId', example: 'order_01abc' })
  @ApiResponse({
    status: 201,
    description: 'Delivery confirmed, financial split triggered',
  })
  confirmDelivery(
    @Param('orderId') orderId: string,
    @Actor() actor: ActorContext,
    @Body() dto: DeliveryConfirmDto,
  ) {
    return this.service.confirmDelivery(orderId, actor, dto.proofR2Key);
  }
}
