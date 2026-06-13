import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { deliveryQuotes } from '../../db/schema/zones';
import { FareService } from './fare.service';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

const QUOTE_TTL_MINUTES = 15;

export class CreateQuoteDto {
  @IsNumber() @Min(-90) @Max(90) pickupLat!: number;
  @IsNumber() @Min(-180) @Max(180) pickupLng!: number;
  @IsNumber() @Min(-90) @Max(90) dropoffLat!: number;
  @IsNumber() @Min(-180) @Max(180) dropoffLng!: number;
  @IsString() @IsOptional() sizeCategory?: string;
  @IsNumber() @IsOptional() @Min(0) packageFee?: number;
}

@Injectable()
export class QuoteService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly fare: FareService,
  ) {}

  async createQuote(dto: CreateQuoteDto) {
    const fareResult = await this.fare.computeFare(
      dto.pickupLat,
      dto.pickupLng,
      dto.dropoffLat,
      dto.dropoffLng,
    );

    const packageFee = dto.packageFee ?? 0;
    const totalFare = fareResult.deliveryFee + packageFee;
    const expiresAt = new Date(Date.now() + QUOTE_TTL_MINUTES * 60_000);

    const [quote] = await this.db
      .insert(deliveryQuotes)
      .values({
        pickupLat: String(dto.pickupLat),
        pickupLng: String(dto.pickupLng),
        dropoffLat: String(dto.dropoffLat),
        dropoffLng: String(dto.dropoffLng),
        distanceMeters: fareResult.distanceMeters,
        distanceSource: fareResult.distanceSource,
        baseFee: fareResult.baseFee,
        ratePerKm: fareResult.ratePerKm,
        distanceFee: fareResult.distanceFee,
        surgeMultiplier: String(fareResult.surgeMultiplier),
        minFee: fareResult.minFee,
        deliveryFee: fareResult.deliveryFee,
        zoneId: fareResult.zoneId,
        ruleId: fareResult.ruleId,
        sizeCategory: dto.sizeCategory,
        packageFee,
        totalFare,
        expiresAt,
      })
      .returning();

    return quote;
  }

  async getQuote(id: string) {
    return this.db.query.deliveryQuotes.findFirst({
      where: eq(deliveryQuotes.id, id),
    });
  }

  async useQuote(id: string) {
    const quote = await this.getQuote(id);
    if (!quote) throw new BadRequestException('Quote not found');
    if (quote.expiresAt < new Date()) {
      throw new BadRequestException('Delivery quote has expired');
    }
    if (quote.usedAt) {
      throw new BadRequestException('Quote already used');
    }

    await this.db
      .update(deliveryQuotes)
      .set({ usedAt: new Date() })
      .where(eq(deliveryQuotes.id, id));

    return quote;
  }
}
