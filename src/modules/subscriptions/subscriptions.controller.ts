import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubscriptionService, SubscribeDto, CancelSubscriptionDto } from './subscription.service';
import { SubscriptionPlanService, CreatePlanDto } from './subscription-plan.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { Public } from '../../auth/session.guard';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

class AddItemDto {
  @ApiProperty({ example: 'var_01abc', description: 'Product variant to include in each delivery cycle' })
  @IsString() variantId!: string;

  @ApiProperty({ example: 2, description: 'Quantity per cycle' })
  @IsInt() @Min(1) quantity!: number;
}

class AddSlotDto {
  @ApiPropertyOptional({ example: 1, description: '0 = Sunday, 1 = Monday, ... 6 = Saturday' })
  @IsInt() @IsOptional() dayOfWeek?: number;

  @ApiPropertyOptional({ example: 8, description: 'Start hour (0–23) in local time' })
  @IsInt() @IsOptional() startHour?: number;

  @ApiPropertyOptional({ example: 12, description: 'End hour (0–23) in local time' })
  @IsInt() @IsOptional() endHour?: number;

  @ApiPropertyOptional({ example: 10, description: 'Max number of deliveries in this slot' })
  @IsInt() @IsOptional() capacity?: number;

  @ApiPropertyOptional({ example: 'Morning delivery (8am–12pm)' })
  @IsString() @IsOptional() label?: string;
}

@ApiTags('Subscriptions (Public)')
@Public()
@Controller('subscription-plans')
export class PublicPlansController {
  constructor(private readonly plans: SubscriptionPlanService) {}

  @Get()
  @ApiOperation({ summary: 'List available subscription plans', description: 'Public. Returns all active subscription plans with their items and time slots.' })
  @ApiResponse({ status: 200, description: 'Array of plans' })
  list() {
    return this.plans.listPublic();
  }
}

@ApiTags('Vendor — Subscriptions')
@ApiCookieAuth('session')
@Controller('v/subscription-plans')
export class VendorPlansController {
  constructor(private readonly plans: SubscriptionPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Create a subscription plan', description: 'Vendors create recurring delivery plans. Add items and time slots after creation.' })
  @ApiResponse({ status: 201, description: 'Created plan' })
  create(@Actor() actor: ActorContext, @Body() dto: CreatePlanDto) {
    return this.plans.createPlan(actor, dto);
  }

  @Put(':id/publish')
  @ApiOperation({ summary: 'Publish a subscription plan', description: 'Makes the plan visible to customers on the storefront. Plan must have at least one item and one slot.' })
  @ApiParam({ name: 'id', example: 'plan_01abc' })
  @ApiResponse({ status: 200, description: 'Published plan' })
  publish(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.plans.publishPlan(id, actor);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add an item to a subscription plan', description: 'Adds a product variant to each delivery cycle of the plan.' })
  @ApiParam({ name: 'id', example: 'plan_01abc' })
  @ApiResponse({ status: 201, description: 'Item added' })
  addItem(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: AddItemDto,
  ) {
    return this.plans.addItem(id, actor, dto.variantId, dto.quantity);
  }

  @Post(':id/slots')
  @ApiOperation({ summary: 'Add a delivery time slot to a plan', description: 'Defines available delivery windows for subscribers to choose from.' })
  @ApiParam({ name: 'id', example: 'plan_01abc' })
  @ApiResponse({ status: 201, description: 'Slot added' })
  addSlot(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: AddSlotDto,
  ) {
    return this.plans.addSlot(id, actor, dto);
  }
}

@ApiTags('Subscriptions')
@ApiCookieAuth('session')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Subscribe to a plan', description: 'Creates a recurring subscription for the customer. The first cycle is scheduled automatically.' })
  @ApiResponse({ status: 201, description: 'Created subscription' })
  subscribe(@Actor() actor: ActorContext, @Body() dto: SubscribeDto) {
    return this.service.subscribe(actor, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my subscriptions' })
  @ApiResponse({ status: 200, description: 'Array of subscriptions with plan details' })
  list(@Actor() actor: ActorContext) {
    return this.service.listMySubscriptions(actor);
  }

  @Put(':id/pause')
  @ApiOperation({ summary: 'Pause a subscription', description: 'Suspends future delivery cycles without cancelling the subscription.' })
  @ApiParam({ name: 'id', example: 'sub_01abc' })
  @ApiResponse({ status: 200, description: 'Paused subscription' })
  pause(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.service.pause(id, actor);
  }

  @Put(':id/resume')
  @ApiOperation({ summary: 'Resume a paused subscription' })
  @ApiParam({ name: 'id', example: 'sub_01abc' })
  @ApiResponse({ status: 200, description: 'Resumed subscription' })
  resume(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.service.resume(id, actor);
  }

  @Put(':id/skip')
  @ApiOperation({ summary: 'Skip the next delivery cycle', description: 'Skips the upcoming cycle and resumes on the one after.' })
  @ApiParam({ name: 'id', example: 'sub_01abc' })
  @ApiResponse({ status: 200, description: 'Next cycle skipped' })
  skip(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.service.skipNextRun(id, actor);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a subscription', description: 'Permanently ends the subscription after the current cycle completes.' })
  @ApiParam({ name: 'id', example: 'sub_01abc' })
  @ApiResponse({ status: 200, description: 'Cancelled subscription' })
  cancel(
    @Param('id') id: string,
    @Actor() actor: ActorContext,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.service.cancel(id, actor, dto);
  }
}
