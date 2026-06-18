import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { customerAddresses } from '../../db/schema/identity';
import { encodeGeohash } from '../../common/geo';
import type { ActorContext } from '../../auth/session.guard';
import type { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class CustomerAddressesService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async list(actor: ActorContext) {
    return this.db.query.customerAddresses.findMany({
      where: eq(customerAddresses.userId, actor.userId),
    });
  }

  async create(actor: ActorContext, dto: CreateAddressDto) {
    const geohash =
      dto.lat !== undefined && dto.lng !== undefined
        ? encodeGeohash(dto.lat, dto.lng, 7)
        : null;

    if (dto.isDefault) {
      await this.clearDefault(actor.userId);
    }

    const [addr] = await this.db
      .insert(customerAddresses)
      .values({
        userId: actor.userId,
        name: dto.name,
        phone: dto.phone,
        city: dto.city,
        town: dto.town,
        street: dto.street,
        addressType: dto.addressType,
        buildingName: dto.buildingName,
        apartmentNo: dto.apartmentNo,
        lat: dto.lat !== undefined ? String(dto.lat) : null,
        lng: dto.lng !== undefined ? String(dto.lng) : null,
        geohash,
        directions: dto.directions,
        isDefault: dto.isDefault ?? false,
      })
      .returning();

    return addr;
  }

  async update(actor: ActorContext, id: string, dto: UpdateAddressDto) {
    const addr = await this.assertOwner(actor.userId, id);

    if (dto.isDefault) {
      await this.clearDefault(actor.userId);
    }

    const geohash =
      dto.lat !== undefined && dto.lng !== undefined
        ? encodeGeohash(dto.lat, dto.lng, 7)
        : addr.geohash;

    const [updated] = await this.db
      .update(customerAddresses)
      .set({
        name: dto.name ?? addr.name,
        phone: dto.phone ?? addr.phone,
        city: dto.city ?? addr.city,
        town: dto.town ?? addr.town,
        street: dto.street ?? addr.street,
        addressType: dto.addressType ?? addr.addressType,
        buildingName: dto.buildingName ?? addr.buildingName,
        apartmentNo: dto.apartmentNo ?? addr.apartmentNo,
        lat: dto.lat !== undefined ? String(dto.lat) : addr.lat,
        lng: dto.lng !== undefined ? String(dto.lng) : addr.lng,
        geohash,
        directions: dto.directions ?? addr.directions,
        isDefault: dto.isDefault ?? addr.isDefault,
      })
      .where(eq(customerAddresses.id, id))
      .returning();

    return updated;
  }

  async setDefault(actor: ActorContext, id: string) {
    await this.assertOwner(actor.userId, id);
    await this.clearDefault(actor.userId);
    await this.db
      .update(customerAddresses)
      .set({ isDefault: true })
      .where(eq(customerAddresses.id, id));
    return { success: true };
  }

  async remove(actor: ActorContext, id: string) {
    await this.assertOwner(actor.userId, id);
    await this.db.delete(customerAddresses).where(eq(customerAddresses.id, id));
    return { deleted: id };
  }

  private async assertOwner(userId: string, id: string) {
    const addr = await this.db.query.customerAddresses.findFirst({
      where: and(
        eq(customerAddresses.id, id),
        eq(customerAddresses.userId, userId),
      ),
    });
    if (!addr) throw new NotFoundException('Address not found');
    if (addr.userId !== userId)
      throw new ForbiddenException('Not your address');
    return addr;
  }

  private async clearDefault(userId: string) {
    await this.db
      .update(customerAddresses)
      .set({ isDefault: false })
      .where(
        and(
          eq(customerAddresses.userId, userId),
          eq(customerAddresses.isDefault, true),
        ),
      );
  }
}
