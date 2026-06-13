import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { IsOptional, IsString } from 'class-validator';

class PickupConfirmDto {
  @IsString()
  code!: string;
}

class DeliveryConfirmDto {
  @IsString()
  @IsOptional()
  proofR2Key?: string;
}

@Controller('dispatch')
export class DispatchController {
  constructor(private readonly service: DispatchService) {}

  @Post(':orderId/accept')
  accept(@Param('orderId') orderId: string, @Actor() actor: ActorContext) {
    return this.service.acceptDelivery(orderId, actor);
  }

  @Post(':orderId/pickup')
  confirmPickup(
    @Param('orderId') orderId: string,
    @Actor() actor: ActorContext,
    @Body() dto: PickupConfirmDto,
  ) {
    return this.service.confirmPickup(orderId, actor, dto.code);
  }

  @Post(':orderId/deliver')
  confirmDelivery(
    @Param('orderId') orderId: string,
    @Actor() actor: ActorContext,
    @Body() dto: DeliveryConfirmDto,
  ) {
    return this.service.confirmDelivery(orderId, actor, dto.proofR2Key);
  }
}
