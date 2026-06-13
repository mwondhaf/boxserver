import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { promotions, campaigns } from '../../db/schema/promotions';
import { RequireRole } from '../../auth/ability/policies.guard';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';

class CreatePromotionDto {
  @IsString() code!: string;
  @IsEnum(['standard', 'buy_x_get_y', 'free_delivery'] as const) type!: string;
  @IsString() @IsOptional() organizationId?: string;
}

class CreateCampaignDto {
  @IsString() name!: string;
  @IsString() @IsOptional() description?: string;
}

@RequireRole('admin')
@Controller('a/promotions')
export class AdminPromotionsController {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  @Get()
  list() {
    return this.db.query.promotions.findMany({
      with: { applicationMethod: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  @Post()
  async create(@Body() dto: CreatePromotionDto) {
    const [promo] = await this.db
      .insert(promotions)
      .values({
        code: dto.code,
        type: dto.type as typeof promotions.$inferInsert['type'],
        organizationId: dto.organizationId,
      })
      .returning();
    return promo;
  }

  @Put(':id/activate')
  async activate(@Param('id') id: string) {
    const [promo] = await this.db
      .update(promotions)
      .set({ status: 'active' })
      .where(eq(promotions.id, id))
      .returning();
    return promo;
  }

  @Put(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    const [promo] = await this.db
      .update(promotions)
      .set({ status: 'expired' })
      .where(eq(promotions.id, id))
      .returning();
    return promo;
  }

  @Get('campaigns')
  listCampaigns() {
    return this.db.query.campaigns.findMany();
  }

  @Post('campaigns')
  async createCampaign(@Body() dto: CreateCampaignDto) {
    const [campaign] = await this.db
      .insert(campaigns)
      .values({ name: dto.name, description: dto.description })
      .returning();
    return campaign;
  }
}

@Controller('v/promotions')
export class VendorPromotionsController {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  @Get()
  list(@Actor() actor: ActorContext) {
    if (!actor.activeOrgId) return [];
    return this.db.query.promotions.findMany({
      where: eq(promotions.organizationId, actor.activeOrgId),
    });
  }
}
