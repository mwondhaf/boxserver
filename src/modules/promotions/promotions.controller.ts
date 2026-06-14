import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { promotions, campaigns } from '../../db/schema/promotions';
import { RequireRole } from '../../auth/ability/policies.guard';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';

class CreatePromotionDto {
  @ApiProperty({ example: 'WELCOME10', description: 'Unique discount code customers will enter at checkout' })
  @IsString() code!: string;

  @ApiProperty({ enum: ['standard', 'buy_x_get_y', 'free_delivery'], example: 'standard' })
  @IsEnum(['standard', 'buy_x_get_y', 'free_delivery'] as const) type!: string;

  @ApiPropertyOptional({ example: 'org_01abc', description: 'Limit to a specific vendor (omit for platform-wide promotion)' })
  @IsString() @IsOptional() organizationId?: string;
}

class CreateCampaignDto {
  @ApiProperty({ example: 'Ramadan Specials 2025' })
  @IsString() name!: string;

  @ApiPropertyOptional({ example: 'Special offers during Ramadan' })
  @IsString() @IsOptional() description?: string;
}

@ApiTags('Admin — Promotions')
@ApiCookieAuth('session')
@RequireRole('admin')
@Controller('a/promotions')
export class AdminPromotionsController {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  @Get()
  @ApiOperation({ summary: 'List all promotions', description: 'Returns all promotions (active, expired, and draft) with their discount rules.' })
  @ApiResponse({ status: 200, description: 'Array of promotions' })
  list() {
    return this.db.query.promotions.findMany({
      with: { applicationMethod: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a promotion', description: 'Creates a new promotion code. Set discount rules and activate separately.' })
  @ApiResponse({ status: 201, description: 'Created promotion' })
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
  @ApiOperation({ summary: 'Activate a promotion', description: 'Makes the promotion code usable at checkout.' })
  @ApiParam({ name: 'id', example: 'promo_01abc' })
  @ApiResponse({ status: 200, description: 'Activated promotion' })
  async activate(@Param('id') id: string) {
    const [promo] = await this.db
      .update(promotions)
      .set({ status: 'active' })
      .where(eq(promotions.id, id))
      .returning();
    return promo;
  }

  @Put(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a promotion', description: 'Expires the promotion so the code is no longer usable.' })
  @ApiParam({ name: 'id', example: 'promo_01abc' })
  @ApiResponse({ status: 200, description: 'Deactivated promotion' })
  async deactivate(@Param('id') id: string) {
    const [promo] = await this.db
      .update(promotions)
      .set({ status: 'expired' })
      .where(eq(promotions.id, id))
      .returning();
    return promo;
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'List promotion campaigns' })
  @ApiResponse({ status: 200, description: 'Array of campaigns' })
  listCampaigns() {
    return this.db.query.campaigns.findMany();
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create a promotion campaign', description: 'Groups multiple promotions under a named campaign (e.g. "Ramadan Specials").' })
  @ApiResponse({ status: 201, description: 'Created campaign' })
  async createCampaign(@Body() dto: CreateCampaignDto) {
    const [campaign] = await this.db
      .insert(campaigns)
      .values({ name: dto.name, description: dto.description })
      .returning();
    return campaign;
  }
}

@ApiTags('Vendor — Promotions')
@ApiCookieAuth('session')
@Controller('v/promotions')
export class VendorPromotionsController {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  @Get()
  @ApiOperation({ summary: 'List my promotions', description: 'Returns promotions scoped to the authenticated vendor\'s organisation.' })
  @ApiResponse({ status: 200, description: 'Array of promotions' })
  list(@Actor() actor: ActorContext) {
    if (!actor.activeOrgId) return [];
    return this.db.query.promotions.findMany({
      where: eq(promotions.organizationId, actor.activeOrgId),
    });
  }
}
