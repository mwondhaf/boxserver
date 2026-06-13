import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { deliveryZones, pricingRules, zoneCommissionMappings } from '../../db/schema/zones';
import { FareService } from './fare.service';
import { QuoteService, CreateQuoteDto } from './quote.service';
import { Public } from '../../auth/session.guard';
import { RequireRole } from '../../auth/ability/policies.guard';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';

class CreateZoneDto {
  @IsString() name!: string;
  @IsString() city!: string;
  @IsNumber() centerLat!: number;
  @IsNumber() centerLng!: number;
  @IsInt() maxDistanceMeters!: number;
  @IsString() @IsOptional() color?: string;
}

class CreatePricingRuleDto {
  @IsString() zoneId!: string;
  @IsString() name!: string;
  @IsInt() baseFee!: number;
  @IsInt() ratePerKm!: number;
  @IsInt() minFee!: number;
}

@Public()
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuoteService) {}

  @Post()
  create(@Body() dto: CreateQuoteDto) {
    return this.quotes.createQuote(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.quotes.getQuote(id);
  }
}

@RequireRole('admin')
@Controller('a/zones')
export class AdminZonesController {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
  ) {}

  @Get()
  list() {
    return this.db.query.deliveryZones.findMany({
      with: { pricingRules: true },
    });
  }

  @Post()
  async create(@Body() dto: CreateZoneDto) {
    const [zone] = await this.db
      .insert(deliveryZones)
      .values({
        name: dto.name,
        city: dto.city,
        country: 'UG',
        centerLat: String(dto.centerLat),
        centerLng: String(dto.centerLng),
        maxDistanceMeters: dto.maxDistanceMeters,
        color: dto.color,
      })
      .returning();
    return zone;
  }

  @Post('rules')
  async createRule(@Body() dto: CreatePricingRuleDto) {
    const [rule] = await this.db
      .insert(pricingRules)
      .values({
        zoneId: dto.zoneId,
        name: dto.name,
        baseFee: dto.baseFee,
        ratePerKm: dto.ratePerKm,
        minFee: dto.minFee,
      })
      .returning();
    return rule;
  }

  @Put(':id/suspend')
  async suspend(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const [zone] = await this.db
      .update(deliveryZones)
      .set({ suspendedAt: new Date(), suspendedReason: body.reason })
      .where(eq(deliveryZones.id, id))
      .returning();
    return zone;
  }

  @Delete(':id/suspend')
  async unsuspend(@Param('id') id: string) {
    const [zone] = await this.db
      .update(deliveryZones)
      .set({ suspendedAt: null, suspendedReason: null })
      .where(eq(deliveryZones.id, id))
      .returning();
    return zone;
  }
}
