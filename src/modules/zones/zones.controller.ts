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
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { deliveryZones, pricingRules } from '../../db/schema/zones';
import { QuoteService, CreateQuoteDto } from './quote.service';
import { Public } from '../../auth/session.guard';
import { RequireRole } from '../../auth/ability/policies.guard';

class CreateZoneDto {
  @ApiProperty({ example: 'Kampala Central' })
  @IsString() name!: string;

  @ApiProperty({ example: 'Kampala' })
  @IsString() city!: string;

  @ApiProperty({ example: 0.3136, description: 'Zone center latitude' })
  @IsNumber() centerLat!: number;

  @ApiProperty({ example: 32.5811, description: 'Zone center longitude' })
  @IsNumber() centerLng!: number;

  @ApiProperty({ example: 5000, description: 'Maximum service radius in meters' })
  @IsInt() maxDistanceMeters!: number;

  @ApiPropertyOptional({ example: '#FF6B6B', description: 'Hex color for map display' })
  @IsString() @IsOptional() color?: string;
}

class CreatePricingRuleDto {
  @ApiProperty({ example: 'zone_01abc' })
  @IsString() zoneId!: string;

  @ApiProperty({ example: 'Standard' })
  @IsString() name!: string;

  @ApiProperty({ example: 2000, description: 'Base delivery fee in UGX' })
  @IsInt() baseFee!: number;

  @ApiProperty({ example: 500, description: 'Additional fee per km in UGX' })
  @IsInt() ratePerKm!: number;

  @ApiProperty({ example: 1500, description: 'Minimum delivery fee in UGX' })
  @IsInt() minFee!: number;
}

@ApiTags('Delivery Quotes (Public)')
@Public()
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuoteService) {}

  @Post()
  @ApiOperation({ summary: 'Get a delivery quote', description: 'Calculates the delivery fee between two coordinates. Returns a quote valid for 15 minutes. Pass the returned ID to checkout.' })
  @ApiResponse({ status: 201, description: 'Quote with fare breakdown and TTL' })
  create(@Body() dto: CreateQuoteDto) {
    return this.quotes.createQuote(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a quote by ID' })
  @ApiParam({ name: 'id', example: 'quote_01abc' })
  @ApiResponse({ status: 200, description: 'Quote object' })
  @ApiResponse({ status: 404, description: 'Quote not found or expired' })
  get(@Param('id') id: string) {
    return this.quotes.getQuote(id);
  }
}

@ApiTags('Admin — Zones')
@ApiCookieAuth('session')
@RequireRole('admin')
@Controller('a/zones')
export class AdminZonesController {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List delivery zones', description: 'Returns all zones with their associated pricing rules.' })
  @ApiResponse({ status: 200, description: 'Array of zones with pricing rules' })
  list() {
    return this.db.query.deliveryZones.findMany({
      with: { pricingRules: true },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a delivery zone', description: 'Defines a circular delivery area around a center point. Vendors within the zone can receive platform deliveries.' })
  @ApiResponse({ status: 201, description: 'Created zone' })
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
  @ApiOperation({ summary: 'Create a pricing rule for a zone', description: 'Defines how delivery fees are calculated within a zone: baseFee + (distanceKm × ratePerKm), with a minFee floor.' })
  @ApiResponse({ status: 201, description: 'Created pricing rule' })
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
  @ApiOperation({ summary: 'Suspend a zone', description: 'Disables deliveries within the zone. Orders can no longer be placed for vendors in this zone.' })
  @ApiParam({ name: 'id', example: 'zone_01abc' })
  @ApiResponse({ status: 200, description: 'Zone suspended' })
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
  @ApiOperation({ summary: 'Unsuspend a zone', description: 'Re-enables deliveries within a previously suspended zone.' })
  @ApiParam({ name: 'id', example: 'zone_01abc' })
  @ApiResponse({ status: 200, description: 'Zone reactivated' })
  async unsuspend(@Param('id') id: string) {
    const [zone] = await this.db
      .update(deliveryZones)
      .set({ suspendedAt: null, suspendedReason: null })
      .where(eq(deliveryZones.id, id))
      .returning();
    return zone;
  }
}
