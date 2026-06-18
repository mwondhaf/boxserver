import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { and, eq } from 'drizzle-orm';
import slugify from 'slugify';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { members, organizations, users } from '../../db/schema/identity';
import { RequireRole } from '../../auth/casl/policies.guard';
import { getAuth } from '../../auth/better-auth';
import type { AppConfig } from '../../common/config/app.config';
import { StorageService } from '../../common/storage/storage.service';
import {
  AddMemberDto,
  CreateOrganizationDto,
  UpdateMemberRoleDto,
  UpdateOrganizationDto,
  UpdatePayoutDto,
} from './dto/create-organization.dto';

@ApiTags('Admin — Vendors')
@ApiCookieAuth('session')
@RequireRole('admin')
@Controller('admin/vendors')
export class AdminVendorsController {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly config: ConfigService<{ app: AppConfig }, true>,
    private readonly storage: StorageService,
  ) {}

  private get databaseUrl() {
    return this.config.get('app.databaseUrl', { infer: true });
  }

  @Get()
  @ApiOperation({
    summary: 'List all vendors',
    description: 'Admin-only. Returns all vendor organizations.',
  })
  @ApiResponse({ status: 200, description: 'Array of vendors' })
  list() {
    return this.db.query.organizations.findMany({
      columns: {
        id: true,
        name: true,
        slug: true,
        type: true,
        email: true,
        phone: true,
        isActive: true,
        isBusy: true,
        createdAt: true,
      },
      with: { category: true },
      orderBy: (organizations, { desc }) => [desc(organizations.createdAt)],
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Create a vendor organization',
    description:
      'Creates a Better Auth organization owned by the authenticated admin.',
  })
  @ApiResponse({ status: 201, description: 'Created vendor' })
  @ApiResponse({ status: 409, description: 'Slug conflict' })
  async create(
    @Actor() actor: ActorContext,
    @Body() dto: CreateOrganizationDto,
  ) {
    const slug = await this.resolveSlug(dto.slug ?? dto.name);

    const auth = getAuth(this.databaseUrl);
    const result = await auth.api.createOrganization({
      body: {
        name: dto.name,
        slug,
        userId: actor.userId,
      },
    });

    if (!result?.id) {
      throw new ConflictException('Failed to create vendor organization');
    }

    // Persist custom schema fields that Better Auth does not manage.
    const [vendor] = await this.db
      .update(organizations)
      .set({
        type: dto.type,
        email: dto.email,
        phone: dto.phone,
        tin: dto.tin,
        contactPerson: dto.contactPerson,
        contactPhone: dto.contactPhone,
        contactPersonEmail: dto.contactPersonEmail,
        cityOrDistrict: dto.cityOrDistrict,
        town: dto.town,
        street: dto.street,
        lat: dto.lat != null ? String(dto.lat) : undefined,
        lng: dto.lng != null ? String(dto.lng) : undefined,
        categoryId: dto.categoryId,
      })
      .where(eq(organizations.id, result.id))
      .returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        type: organizations.type,
        email: organizations.email,
        phone: organizations.phone,
        isActive: organizations.isActive,
        createdAt: organizations.createdAt,
      });

    return vendor;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiParam({ name: 'id', example: 'org_01abc' })
  @ApiResponse({ status: 200, description: 'Vendor record' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getById(@Param('id') id: string) {
    const vendor = await this.db.query.organizations.findFirst({
      where: eq(organizations.id, id),
      with: { category: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vendor details' })
  @ApiParam({ name: 'id', example: 'org_01abc' })
  @ApiResponse({ status: 200, description: 'Updated vendor' })
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    const [updated] = await this.db
      .update(organizations)
      .set({
        ...dto,
        minimumOrderAmount:
          dto.minimumOrderAmount != null
            ? String(dto.minimumOrderAmount)
            : undefined,
        selfDeliveryFee:
          dto.selfDeliveryFee != null ? String(dto.selfDeliveryFee) : undefined,
        selfDeliveryRadius:
          dto.selfDeliveryRadius != null
            ? String(dto.selfDeliveryRadius)
            : undefined,
      })
      .where(eq(organizations.id, id))
      .returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        type: organizations.type,
        email: organizations.email,
        phone: organizations.phone,
        isActive: organizations.isActive,
        isBusy: organizations.isBusy,
        createdAt: organizations.createdAt,
      });

    if (!updated) throw new NotFoundException('Vendor not found');
    return updated;
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a vendor' })
  @ApiParam({ name: 'id', example: 'org_01abc' })
  @ApiResponse({ status: 200, description: 'Activated vendor' })
  async activate(@Param('id') id: string) {
    const [updated] = await this.db
      .update(organizations)
      .set({ isActive: true })
      .where(eq(organizations.id, id))
      .returning({ id: organizations.id, isActive: organizations.isActive });
    if (!updated) throw new NotFoundException('Vendor not found');
    return updated;
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a vendor' })
  @ApiParam({ name: 'id', example: 'org_01abc' })
  @ApiResponse({ status: 200, description: 'Deactivated vendor' })
  async deactivate(@Param('id') id: string) {
    const [updated] = await this.db
      .update(organizations)
      .set({ isActive: false })
      .where(eq(organizations.id, id))
      .returning({ id: organizations.id, isActive: organizations.isActive });
    if (!updated) throw new NotFoundException('Vendor not found');
    return updated;
  }

  @Patch(':id/payout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update vendor payout settings' })
  @ApiParam({ name: 'id', example: 'org_01abc' })
  @ApiResponse({ status: 200, description: 'Updated payout settings' })
  async updatePayout(@Param('id') id: string, @Body() dto: UpdatePayoutDto) {
    const [updated] = await this.db
      .update(organizations)
      .set({
        payoutMethod: dto.payoutMethod,
        mobileMoneyProvider: dto.mobileMoneyProvider,
        payoutMobileNumber: dto.payoutMobileNumber,
        mobileMoneyName: dto.mobileMoneyName,
        payoutBankName: dto.payoutBankName,
        payoutBankAccount: dto.payoutBankAccount,
        bankAccountName: dto.bankAccountName,
        payoutBankBranch: dto.payoutBankBranch,
      })
      .where(eq(organizations.id, id))
      .returning({
        id: organizations.id,
        payoutMethod: organizations.payoutMethod,
        mobileMoneyProvider: organizations.mobileMoneyProvider,
        payoutMobileNumber: organizations.payoutMobileNumber,
        mobileMoneyName: organizations.mobileMoneyName,
        payoutBankName: organizations.payoutBankName,
        payoutBankAccount: organizations.payoutBankAccount,
        bankAccountName: organizations.bankAccountName,
        payoutBankBranch: organizations.payoutBankBranch,
      });
    if (!updated) throw new NotFoundException('Vendor not found');
    return updated;
  }

  @Post(':id/cover-photo')
  @ApiOperation({ summary: "Upload or replace a vendor's cover photo" })
  @ApiParam({ name: 'id', example: 'org_01abc' })
  @ApiResponse({ status: 201, description: 'Updated cover photo URL' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCoverPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const vendor = await this.db.query.organizations.findFirst({
      where: eq(organizations.id, id),
      columns: { id: true, coverPhoto: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const { publicUrl } = await this.storage.uploadFile(
      `vendors/${id}/cover`,
      file,
    );

    if (vendor.coverPhoto) {
      const oldKey = this.storage.keyFromPublicUrl(vendor.coverPhoto);
      if (oldKey) await this.storage.deleteObject(oldKey);
    }

    await this.db
      .update(organizations)
      .set({ coverPhoto: publicUrl })
      .where(eq(organizations.id, id));

    return { coverPhoto: publicUrl };
  }

  @Delete(':id/cover-photo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove a vendor's cover photo" })
  @ApiParam({ name: 'id', example: 'org_01abc' })
  @ApiResponse({ status: 200, description: 'Cover photo removed' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async deleteCoverPhoto(@Param('id') id: string) {
    const vendor = await this.db.query.organizations.findFirst({
      where: eq(organizations.id, id),
      columns: { id: true, coverPhoto: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (vendor.coverPhoto) {
      const key = this.storage.keyFromPublicUrl(vendor.coverPhoto);
      if (key) await this.storage.deleteObject(key);
    }

    await this.db
      .update(organizations)
      .set({ coverPhoto: null })
      .where(eq(organizations.id, id));

    return { success: true };
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List vendor members' })
  @ApiParam({ name: 'id', example: 'org_01abc' })
  @ApiResponse({
    status: 200,
    description: 'Array of members with user details',
  })
  async listMembers(@Param('id') id: string) {
    const vendor = await this.db.query.organizations.findFirst({
      where: eq(organizations.id, id),
      columns: { id: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    return this.db.query.members.findMany({
      where: eq(members.organizationId, id),
      columns: { id: true, role: true, createdAt: true },
      with: {
        user: { columns: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a user to this vendor by email' })
  @ApiParam({ name: 'id', example: 'org_01abc' })
  @ApiResponse({ status: 201, description: 'Added member' })
  @ApiResponse({ status: 404, description: 'Vendor or user not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  async addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    const vendor = await this.db.query.organizations.findFirst({
      where: eq(organizations.id, id),
      columns: { id: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
      columns: { id: true, name: true, email: true },
    });
    if (!user)
      throw new NotFoundException(`No user found with email ${dto.email}`);

    const existing = await this.db.query.members.findFirst({
      where: and(eq(members.organizationId, id), eq(members.userId, user.id)),
      columns: { id: true },
    });
    if (existing)
      throw new ConflictException('User is already a member of this vendor');

    const [member] = await this.db
      .insert(members)
      .values({
        id: crypto.randomUUID(),
        organizationId: id,
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

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: "Update a member's role" })
  @ApiParam({ name: 'id', example: 'org_01abc' })
  @ApiParam({ name: 'memberId', example: 'mem_01abc' })
  @ApiResponse({ status: 200, description: 'Updated member' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const [updated] = await this.db
      .update(members)
      .set({ role: dto.role })
      .where(and(eq(members.id, memberId), eq(members.organizationId, id)))
      .returning({
        id: members.id,
        role: members.role,
        userId: members.userId,
        organizationId: members.organizationId,
      });
    if (!updated) throw new NotFoundException('Member not found');
    return updated;
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from this vendor' })
  @ApiParam({ name: 'id', example: 'org_01abc' })
  @ApiParam({ name: 'memberId', example: 'mem_01abc' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    const result = await this.db
      .delete(members)
      .where(and(eq(members.id, memberId), eq(members.organizationId, id)))
      .returning({ id: members.id });
    if (!result.length) throw new NotFoundException('Member not found');
  }

  // Generates a slug from `source` and appends a numeric suffix when the base
  // slug is already taken, ensuring uniqueness without throwing a 409.
  private async resolveSlug(source: string): Promise<string> {
    const base = slugify(source, { lower: true, strict: true });
    const existing = await this.db.query.organizations.findFirst({
      where: eq(organizations.slug, base),
      columns: { id: true },
    });
    if (!existing) return base;

    // Find the highest existing suffix and increment.
    const rows = await this.db.query.organizations.findMany({
      columns: { slug: true },
    });
    const taken = new Set(rows.map((r) => r.slug));
    let i = 2;
    while (taken.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  }
}
