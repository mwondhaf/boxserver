import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import {
  subscriptionPlans,
  subscriptionPlanItems,
  subscriptionPlanSlots,
} from '../../db/schema/subscriptions';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Public } from '../../auth/session.guard';
import type { ActorContext } from '../../auth/session.guard';

export class CreatePlanDto {
  @ApiProperty({ example: 'Weekly Veggie Box' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'weekly-veggie-box' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ example: 'Fresh vegetables delivered every week' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['weekly', 'biweekly', 'monthly'], example: 'weekly' })
  @IsEnum(['weekly', 'biweekly', 'monthly'] as const)
  cadence!: string;

  @ApiProperty({ example: 4, description: 'Total number of delivery cycles' })
  @IsInt()
  @Min(1)
  totalCycles!: number;

  @ApiProperty({ example: 45000, description: 'Bundle price per cycle in UGX' })
  @IsInt()
  @Min(0)
  bundlePricePerCycle!: number;
}

@Injectable()
export class SubscriptionPlanService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async listPublic(orgSlug?: string) {
    return this.db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      with: {
        items: { with: { variant: { with: { product: true } } } },
        slots: true,
      },
    });
  }

  async createPlan(actor: ActorContext, dto: CreatePlanDto) {
    if (!actor.activeOrgId)
      throw new BadRequestException('No active organization');

    const [plan] = await this.db
      .insert(subscriptionPlans)
      .values({
        organizationId: actor.activeOrgId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        cadence:
          dto.cadence as (typeof subscriptionPlans.$inferInsert)['cadence'],
        totalCycles: dto.totalCycles,
        bundlePricePerCycle: dto.bundlePricePerCycle,
      })
      .returning();

    return plan;
  }

  async publishPlan(id: string, actor: ActorContext) {
    const plan = await this.assertOrgOwns(id, actor);
    const [updated] = await this.db
      .update(subscriptionPlans)
      .set({ isActive: true })
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return updated;
  }

  async addItem(
    planId: string,
    actor: ActorContext,
    variantId: string,
    quantity: number,
  ) {
    await this.assertOrgOwns(planId, actor);
    const [item] = await this.db
      .insert(subscriptionPlanItems)
      .values({ planId, variantId, quantity })
      .returning();
    return item;
  }

  async addSlot(
    planId: string,
    actor: ActorContext,
    dto: {
      dayOfWeek?: number;
      startHour?: number;
      endHour?: number;
      capacity?: number;
      label?: string;
    },
  ) {
    await this.assertOrgOwns(planId, actor);
    const [slot] = await this.db
      .insert(subscriptionPlanSlots)
      .values({ planId, ...dto })
      .returning();
    return slot;
  }

  private async assertOrgOwns(planId: string, actor: ActorContext) {
    const plan = await this.db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
    });
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.organizationId !== actor.activeOrgId) {
      throw new ForbiddenException('Not your plan');
    }
    return plan;
  }
}
