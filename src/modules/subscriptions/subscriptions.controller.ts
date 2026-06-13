import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { SubscriptionService, SubscribeDto, CancelSubscriptionDto } from './subscription.service';
import { SubscriptionPlanService, CreatePlanDto } from './subscription-plan.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { Public } from '../../auth/session.guard';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

class AddItemDto {
  @IsString() variantId!: string;
  @IsInt() @Min(1) quantity!: number;
}

class AddSlotDto {
  @IsInt() @IsOptional() dayOfWeek?: number;
  @IsInt() @IsOptional() startHour?: number;
  @IsInt() @IsOptional() endHour?: number;
  @IsInt() @IsOptional() capacity?: number;
  @IsString() @IsOptional() label?: string;
}

@Public()
@Controller('subscription-plans')
export class PublicPlansController {
  constructor(private readonly plans: SubscriptionPlanService) {}

  @Get()
  list() {
    return this.plans.listPublic();
  }
}

@Controller('v/subscription-plans')
export class VendorPlansController {
  constructor(private readonly plans: SubscriptionPlanService) {}

  @Post()
  create(@Actor() actor: ActorContext, @Body() dto: CreatePlanDto) {
    return this.plans.createPlan(actor, dto);
  }

  @Put(':id/publish')
  publish(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.plans.publishPlan(id, actor);
  }

  @Post(':id/items')
  addItem(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: AddItemDto,
  ) {
    return this.plans.addItem(id, actor, dto.variantId, dto.quantity);
  }

  @Post(':id/slots')
  addSlot(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: AddSlotDto,
  ) {
    return this.plans.addSlot(id, actor, dto);
  }
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionService) {}

  @Post()
  subscribe(@Actor() actor: ActorContext, @Body() dto: SubscribeDto) {
    return this.service.subscribe(actor, dto);
  }

  @Get()
  list(@Actor() actor: ActorContext) {
    return this.service.listMySubscriptions(actor);
  }

  @Put(':id/pause')
  pause(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.service.pause(id, actor);
  }

  @Put(':id/resume')
  resume(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.service.resume(id, actor);
  }

  @Put(':id/skip')
  skip(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.service.skipNextRun(id, actor);
  }

  @Put(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.service.cancel(id, actor, dto);
  }
}
