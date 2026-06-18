import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import {
  organizations,
  members,
  invitations,
  users,
} from '../../db/schema/identity';
import type { ActorContext } from '../../auth/session.guard';
import type {
  AddMemberDto,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  UpdatePayoutDto,
  UpdateMemberRoleDto,
} from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async getMyOrganization(actor: ActorContext) {
    if (!actor.activeOrgId)
      throw new NotFoundException('No active organization');

    const org = await this.db.query.organizations.findFirst({
      where: eq(organizations.id, actor.activeOrgId),
      with: {
        members: {
          with: { user: { columns: { id: true, name: true, email: true } } },
        },
        category: true,
      },
    });

    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async getOrganizationById(id: string) {
    const org = await this.db.query.organizations.findFirst({
      where: eq(organizations.id, id),
      with: { category: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateOrganization(actor: ActorContext, dto: UpdateOrganizationDto) {
    const orgId = this.requireActiveOrg(actor);
    this.requireOrgRole(actor, ['owner', 'admin']);

    const { minimumOrderAmount, selfDeliveryFee, selfDeliveryRadius, ...rest } =
      dto;

    const [updated] = await this.db
      .update(organizations)
      .set({
        ...rest,
        minimumOrderAmount:
          minimumOrderAmount != null ? String(minimumOrderAmount) : undefined,
        selfDeliveryFee:
          selfDeliveryFee != null ? String(selfDeliveryFee) : undefined,
        selfDeliveryRadius:
          selfDeliveryRadius != null ? String(selfDeliveryRadius) : undefined,
      })
      .where(eq(organizations.id, orgId))
      .returning();

    return updated;
  }

  async updatePayout(actor: ActorContext, dto: UpdatePayoutDto) {
    const orgId = this.requireActiveOrg(actor);
    this.requireOrgRole(actor, ['owner']);

    const [updated] = await this.db
      .update(organizations)
      .set({
        ...dto,
        payoutMethod: dto.payoutMethod,
      })
      .where(eq(organizations.id, orgId))
      .returning();

    return updated;
  }

  async deleteOrganization(actor: ActorContext) {
    const orgId = this.requireActiveOrg(actor);
    this.requireOrgRole(actor, ['owner']);

    await this.db.delete(organizations).where(eq(organizations.id, orgId));

    return { deleted: orgId };
  }

  async getMembers(actor: ActorContext) {
    const orgId = this.requireActiveOrg(actor);

    return this.db.query.members.findMany({
      where: eq(members.organizationId, orgId),
      with: {
        user: { columns: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async addMember(actor: ActorContext, dto: AddMemberDto) {
    const orgId = this.requireActiveOrg(actor);
    this.requireOrgRole(actor, ['owner', 'admin']);

    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
      columns: { id: true, name: true, email: true },
    });
    if (!user)
      throw new NotFoundException(`No user found with email ${dto.email}`);

    const existing = await this.db.query.members.findFirst({
      where: and(
        eq(members.organizationId, orgId),
        eq(members.userId, user.id),
      ),
      columns: { id: true },
    });
    if (existing)
      throw new ConflictException('User is already a member of this vendor');

    const [member] = await this.db
      .insert(members)
      .values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: user.id,
        role: dto.role,
      })
      .returning({
        id: members.id,
        role: members.role,
        organizationId: members.organizationId,
        userId: members.userId,
        createdAt: members.createdAt,
      });

    return { ...member, user };
  }

  async updateMemberRole(
    actor: ActorContext,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const orgId = this.requireActiveOrg(actor);
    this.requireOrgRole(actor, ['owner', 'admin']);

    const member = await this.db.query.members.findFirst({
      where: and(eq(members.id, memberId), eq(members.organizationId, orgId)),
    });

    if (!member) throw new NotFoundException('Member not found');

    const [updated] = await this.db
      .update(members)
      .set({ role: dto.role })
      .where(eq(members.id, memberId))
      .returning();

    return updated;
  }

  async removeMember(actor: ActorContext, memberId: string) {
    const orgId = this.requireActiveOrg(actor);
    this.requireOrgRole(actor, ['owner', 'admin']);

    const member = await this.db.query.members.findFirst({
      where: and(eq(members.id, memberId), eq(members.organizationId, orgId)),
    });

    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'owner')
      throw new ForbiddenException('Cannot remove organization owner');

    await this.db.delete(members).where(eq(members.id, memberId));
    return { removed: memberId };
  }

  async getInvitations(actor: ActorContext) {
    const orgId = this.requireActiveOrg(actor);
    return this.db.query.invitations.findMany({
      where: eq(invitations.organizationId, orgId),
    });
  }

  // Helpers
  private requireActiveOrg(actor: ActorContext): string {
    if (!actor.activeOrgId)
      throw new ForbiddenException('No active organization context');
    return actor.activeOrgId;
  }

  private requireOrgRole(
    actor: ActorContext,
    roles: Array<'owner' | 'admin' | 'member'>,
  ): void {
    if (!actor.orgRole || !roles.includes(actor.orgRole)) {
      throw new ForbiddenException(`Required org role: ${roles.join(' or ')}`);
    }
  }
}
