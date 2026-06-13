import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { parcels, parcelEvents } from '../../db/schema/parcels';
import { CountersService } from '../../common/counters/counters.service';
import { QuoteService } from '../zones/quote.service';
import { encodeGeohash } from '../../common/geo';
import { EventBus } from '../../realtime/event-bus';
import type { ActorContext } from '../../auth/session.guard';
import type { CreateParcelDto, CancelParcelDto } from './dto/parcel.dto';

@Injectable()
export class ParcelService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly counters: CountersService,
    private readonly quotes: QuoteService,
    private readonly eventBus: EventBus,
  ) {}

  async createParcel(actor: ActorContext, dto: CreateParcelDto) {
    let deliveryFee = 0;
    let totalFare = 0;

    if (dto.deliveryQuoteId) {
      const quote = await this.quotes.getQuote(dto.deliveryQuoteId);
      if (!quote) throw new BadRequestException('Quote not found');
      if (quote.expiresAt < new Date()) throw new BadRequestException('Quote expired');
      deliveryFee = quote.deliveryFee;
      totalFare = quote.totalFare ?? deliveryFee;
    }

    const displayId = await this.counters.nextValue('parcels');
    const pickupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const dropoffCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const [parcel] = await this.db
      .insert(parcels)
      .values({
        displayId,
        senderUserId: actor.userId,
        pickupName: dto.pickupName,
        pickupPhone: dto.pickupPhone,
        pickupAddress: dto.pickupAddress,
        pickupLat: String(dto.pickupLat),
        pickupLng: String(dto.pickupLng),
        pickupGeohash: encodeGeohash(dto.pickupLat, dto.pickupLng, 7),
        pickupNotes: dto.pickupNotes ?? null,
        dropoffName: dto.dropoffName,
        dropoffPhone: dto.dropoffPhone,
        dropoffAddress: dto.dropoffAddress,
        dropoffLat: String(dto.dropoffLat),
        dropoffLng: String(dto.dropoffLng),
        dropoffGeohash: encodeGeohash(dto.dropoffLat, dto.dropoffLng, 7),
        dropoffNotes: dto.dropoffNotes ?? null,
        sizeCategory: dto.sizeCategory as typeof parcels.$inferInsert['sizeCategory'],
        description: dto.description ?? 'Parcel',
        valueAmount: dto.declaredValue !== undefined ? dto.declaredValue : null,
        quoteId: dto.deliveryQuoteId ?? null,
        deliveryFeeAmount: deliveryFee,
        priceAmount: totalFare,
        status: 'pending',
        pickupCode,
        deliveryCode: dropoffCode,
        paymentMethod: dto.paymentMethod ?? null,
      })
      .returning();

    if (!parcel) throw new BadRequestException('Failed to create parcel');

    if (dto.deliveryQuoteId) {
      await this.quotes.useQuote(dto.deliveryQuoteId).catch(() => null);
    }

    await this.db.insert(parcelEvents).values({
      parcelId: parcel.id,
      eventType: 'parcel.created',
      actorUserId: actor.userId,
    });

    this.eventBus.emit('parcel.created', { parcelId: parcel.id, senderUserId: actor.userId });

    return parcel;
  }

  async listMyParcels(actor: ActorContext) {
    return this.db.query.parcels.findMany({
      where: eq(parcels.senderUserId, actor.userId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  async getParcel(id: string) {
    const parcel = await this.db.query.parcels.findFirst({
      where: eq(parcels.id, id),
      with: { events: { orderBy: (t, { desc }) => [desc(t.createdAt)] } },
    });
    if (!parcel) throw new NotFoundException('Parcel not found');
    return parcel;
  }

  async cancelParcel(id: string, actor: ActorContext, dto: CancelParcelDto) {
    const parcel = await this.db.query.parcels.findFirst({
      where: eq(parcels.id, id),
    });
    if (!parcel) throw new NotFoundException('Parcel not found');
    if (parcel.senderUserId !== actor.userId) {
      throw new BadRequestException('Not your parcel');
    }
    if (!['pending', 'draft'].includes(parcel.status)) {
      throw new BadRequestException(`Cannot cancel parcel in status '${parcel.status}'`);
    }

    await this.db
      .update(parcels)
      .set({ status: 'canceled' })
      .where(eq(parcels.id, id));

    await this.db.insert(parcelEvents).values({
      parcelId: id,
      eventType: 'parcel.cancelled',
      actorUserId: actor.userId,
      description: dto.reason,
    });

    this.eventBus.emit('parcel.status_changed', {
      parcelId: id,
      toStatus: 'canceled',
      senderUserId: actor.userId,
    });

    return { success: true };
  }
}
