import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import {
  riders,
  riderLocations,
  riderRatings,
  riderIncidents,
  riderStageMemberships,
  stages,
} from '../../db/schema/riders';
import { CountersService } from '../../common/counters/counters.service';
import { encodeGeohash } from '../../common/geo';
import { EventBus } from '../../realtime/event-bus';
import type { ActorContext } from '../../auth/session.guard';
import type {
  ApplyRiderDto,
  UpdateLocationDto,
  SetStatusDto,
  AdminApproveDto,
  AssignStageDto,
  RateRiderDto,
  ReportIncidentDto,
} from './dto/rider.dto';

@Injectable()
export class RiderService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly counters: CountersService,
    private readonly eventBus: EventBus,
  ) {}

  async apply(actor: ActorContext, dto: ApplyRiderDto) {
    const existing = await this.db.query.riders.findFirst({
      where: eq(riders.userId, actor.userId),
    });
    if (existing) throw new ConflictException('Already applied as rider');

    const seq = await this.counters.nextValue('riders');
    const riderCode = `R${String(seq).padStart(5, '0')}`;

    const [rider] = await this.db
      .insert(riders)
      .values({
        userId: actor.userId,
        riderCode,
        name: dto.name,
        phoneNumber: dto.phoneNumber,
        vehicleType:
          dto.vehicleType as (typeof riders.$inferInsert)['vehicleType'],
        vehiclePlate: dto.vehiclePlate,
        nationalId: dto.nationalId,
        drivingPermitNumber: dto.drivingPermitNumber,
        payoutMethod: dto.payoutMethod,
        payoutMobileNumber: dto.payoutMobileNumber,
        employmentType:
          dto.employmentType as (typeof riders.$inferInsert)['employmentType'],
        accountStatus: 'pending',
      })
      .returning();

    return rider;
  }

  async getProfile(actor: ActorContext) {
    const rider = await this.db.query.riders.findFirst({
      where: eq(riders.userId, actor.userId),
    });
    if (!rider) throw new NotFoundException('Rider profile not found');
    return rider;
  }

  async updateLocation(actor: ActorContext, dto: UpdateLocationDto) {
    const geohash = encodeGeohash(dto.lat, dto.lng, 7);

    await this.db
      .insert(riderLocations)
      .values({
        userId: actor.userId,
        lat: String(dto.lat),
        lng: String(dto.lng),
        geohash,
        status: 'online',
        lastUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: riderLocations.userId,
        set: {
          lat: String(dto.lat),
          lng: String(dto.lng),
          geohash,
          lastUpdatedAt: new Date(),
        },
      });

    this.eventBus.emit('rider.location', {
      userId: actor.userId,
      lat: dto.lat,
      lng: dto.lng,
      geohash,
    });

    return { success: true };
  }

  async setStatus(actor: ActorContext, dto: SetStatusDto) {
    await this.db
      .insert(riderLocations)
      .values({
        userId: actor.userId,
        lat: '0',
        lng: '0',
        status: dto.status as (typeof riderLocations.$inferInsert)['status'],
        lastUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: riderLocations.userId,
        set: {
          status: dto.status,
          lastUpdatedAt: new Date(),
        },
      });

    return { status: dto.status };
  }

  async rateRider(actor: ActorContext, dto: RateRiderDto) {
    const riderProfile = await this.db.query.riders.findFirst({
      where: eq(riders.userId, actor.userId),
    });

    if (!riderProfile) throw new NotFoundException('Rider not found');

    await this.db.insert(riderRatings).values({
      riderId: riderProfile.id,
      orderId: dto.orderId,
      customerUserId: actor.userId,
      rating: dto.rating,
      comment: dto.comment,
    });

    await this.db
      .update(riders)
      .set({
        ratingSum: sql`${riders.ratingSum} + ${dto.rating}`,
        ratingCount: sql`${riders.ratingCount} + 1`,
      })
      .where(eq(riders.id, riderProfile.id));

    return { success: true };
  }

  async reportIncident(actor: ActorContext, dto: ReportIncidentDto) {
    const [incident] = await this.db
      .insert(riderIncidents)
      .values({
        deliveryKind: dto.deliveryKind,
        deliveryId: dto.deliveryId,
        riderUserId: actor.userId,
        category: dto.category,
        description: dto.description,
      })
      .returning();

    return incident;
  }

  async adminApprove(id: string, actor: ActorContext, dto: AdminApproveDto) {
    const rider = await this.db.query.riders.findFirst({
      where: eq(riders.id, id),
    });
    if (!rider) throw new NotFoundException('Rider not found');

    if (dto.approve === false) {
      await this.db
        .update(riders)
        .set({
          accountStatus: 'suspended',
          suspendedAt: new Date(),
          suspendedBy: actor.userId,
          suspensionReason: dto.suspensionReason,
        })
        .where(eq(riders.id, id));
    } else {
      await this.db
        .update(riders)
        .set({
          accountStatus: 'active',
          approvedAt: new Date(),
          approvedBy: actor.userId,
        })
        .where(eq(riders.id, id));
    }

    return this.db.query.riders.findFirst({ where: eq(riders.id, id) });
  }

  async assignStage(riderId: string, actor: ActorContext, dto: AssignStageDto) {
    const rider = await this.db.query.riders.findFirst({
      where: eq(riders.id, riderId),
    });
    if (!rider) throw new NotFoundException('Rider not found');

    const stage = await this.db.query.stages.findFirst({
      where: eq(stages.id, dto.stageId),
    });
    if (!stage) throw new NotFoundException('Stage not found');

    const [membership] = await this.db
      .insert(riderStageMemberships)
      .values({
        riderId,
        stageId: dto.stageId,
        isPrimary: dto.isPrimary ?? false,
        assignedBy: actor.userId,
      })
      .returning();

    if (dto.isPrimary) {
      await this.db
        .update(riders)
        .set({ currentStageId: dto.stageId })
        .where(eq(riders.id, riderId));
    }

    return membership;
  }

  async listForAdmin() {
    return this.db.query.riders.findMany({
      with: { location: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  async listStages() {
    return this.db.query.stages.findMany({
      where: eq(stages.isActive, true),
    });
  }
}
