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
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, gt, max, ne } from 'drizzle-orm';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import crypto from 'node:crypto';
import { parseUgandanPhone } from '../../common/validation/ugandan-phone.validator';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import {
  sessions,
  members,
  users,
  verifications,
} from '../../db/schema/identity';
import { RequireRole } from '../../auth/casl/policies.guard';
import { getAuth } from '../../auth/better-auth';
import type { AppConfig } from '../../common/config/app.config';

// ─── DTOs ────────────────────────────────────────────────────────────────────

class CreateUserDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    enum: ['customer', 'rider', 'admin'],
    example: 'customer',
  })
  @IsEnum(['customer', 'rider', 'admin'])
  @IsOptional()
  platformRole?: 'customer' | 'rider' | 'admin';
}

class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}

class UpdateUserRoleDto {
  @ApiProperty({ enum: ['customer', 'rider', 'admin'], example: 'admin' })
  @IsEnum(['customer', 'rider', 'admin'])
  platformRole!: 'customer' | 'rider' | 'admin';
}

class BanUserDto {
  @ApiPropertyOptional({ example: 'Violated terms of service' })
  @IsOptional()
  @IsString()
  banReason?: string;

  @ApiPropertyOptional({
    description: 'Seconds until ban expires. Omit for permanent ban.',
    example: 86400,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  banExpiresIn?: number;
}

class VerifyPhoneOtpDto {
  @ApiProperty({ example: '+256700000000' })
  @IsString()
  phoneNumber!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  code!: string;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Admin — Users')
@ApiCookieAuth('session')
@RequireRole('admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly config: ConfigService<{ app: AppConfig }, true>,
  ) {}

  private get databaseUrl() {
    return this.config.get('app.databaseUrl', { infer: true });
  }

  // ── User list & create ──────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all users' })
  listUsers() {
    return this.db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        banned: true,
        banReason: true,
        banExpires: true,
        createdAt: true,
      },
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Create / invite a user',
    description:
      'Creates a new user account with a random temporary password. ' +
      'Follow up with POST /:id/send-password-reset so the user can set their own password.',
  })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async createUser(@Body() dto: CreateUserDto) {
    const existing = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
      columns: { id: true },
    });
    if (existing) throw new ConflictException('Email already in use');

    const auth = getAuth(this.databaseUrl);
    const result = await auth.api.signUpEmail({
      body: {
        name: dto.name,
        email: dto.email,
        password: crypto.randomUUID(), // temp — user resets on first login
      },
    });

    if (!result) throw new ConflictException('Failed to create user');

    if (dto.platformRole && dto.platformRole !== 'customer') {
      await this.db
        .update(users)
        .set({ platformRole: dto.platformRole })
        .where(eq(users.id, result.user.id));
    }

    return {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      platformRole: dto.platformRole ?? 'customer',
    };
  }

  // ── Single user ─────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get user detail including last login time' })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  async getUser(@Param('id') id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        platformRole: true,
        banned: true,
        banReason: true,
        banExpires: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [lastSession] = await this.db
      .select({ lastLoginAt: max(sessions.updatedAt) })
      .from(sessions)
      .where(eq(sessions.userId, id));

    return { ...user, lastLoginAt: lastSession?.lastLoginAt ?? null };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user name and/or email' })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    if (dto.email) {
      const conflict = await this.db.query.users.findFirst({
        where: eq(users.email, dto.email),
        columns: { id: true },
      });
      if (conflict && conflict.id !== id)
        throw new ConflictException('Email already in use');
    }

    const [updated] = await this.db
      .update(users)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
      })
      .where(eq(users.id, id))
      .returning({ id: users.id, name: users.name, email: users.email });

    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update user platform role' })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    const [updated] = await this.db
      .update(users)
      .set({ platformRole: dto.platformRole })
      .where(eq(users.id, id))
      .returning({ id: users.id, platformRole: users.platformRole });
    return updated;
  }

  // ── Ban / unban ─────────────────────────────────────────────────────────

  @Post(':id/ban')
  @ApiOperation({ summary: 'Ban a user' })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  async banUser(@Param('id') id: string, @Body() dto: BanUserDto) {
    const banExpires = dto.banExpiresIn
      ? new Date(Date.now() + dto.banExpiresIn * 1000)
      : null;

    const [updated] = await this.db
      .update(users)
      .set({ banned: true, banReason: dto.banReason ?? null, banExpires })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        banned: users.banned,
        banReason: users.banReason,
        banExpires: users.banExpires,
      });
    return updated;
  }

  @Post(':id/unban')
  @ApiOperation({ summary: 'Unban a user' })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  async unbanUser(@Param('id') id: string) {
    const [updated] = await this.db
      .update(users)
      .set({ banned: false, banReason: null, banExpires: null })
      .where(eq(users.id, id))
      .returning({ id: users.id, banned: users.banned });
    return updated;
  }

  // ── Password reset ──────────────────────────────────────────────────────

  @Post(':id/send-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send password reset email',
    description:
      'Triggers a password reset email via Better Auth. ' +
      'Requires the server to have an email provider configured.',
  })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  async sendPasswordReset(@Param('id') id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { email: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const auth = getAuth(this.databaseUrl);
    const frontendUrl =
      this.config.get('app.betterAuth.url', { infer: true }) ??
      'http://localhost:3001';

    try {
      // `forgetPassword` exists at runtime but the InferAPI generic narrows the
      // type based on registered plugins; cast through unknown to bypass it.
      await (
        auth.api as unknown as {
          forgetPassword: (opts: {
            body: { email: string; redirectTo: string };
            headers: Headers;
          }) => Promise<unknown>;
        }
      ).forgetPassword({
        body: {
          email: user.email,
          redirectTo: `${frontendUrl}/auth/reset-password`,
        },
        headers: new Headers({
          origin: frontendUrl,
          host: new URL(frontendUrl).host,
        }),
      });
    } catch {
      // Email delivery may not be configured; the reset token is still created
    }

    return { message: 'Password reset initiated.' };
  }

  // ── Phone number ────────────────────────────────────────────────────────

  @Post(':id/phone/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and update phone number for a user' })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  async verifyPhoneOtp(
    @Param('id') id: string,
    @Body() dto: VerifyPhoneOtpDto,
  ) {
    let e164: string;
    try {
      e164 = parseUgandanPhone(dto.phoneNumber);
    } catch {
      throw new BadRequestException(
        'Phone number must be a valid Ugandan number',
      );
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const conflict = await this.db.query.users.findFirst({
      where: and(eq(users.phoneNumber, e164), ne(users.id, id)),
      columns: { id: true },
    });
    if (conflict) throw new ConflictException('Phone number already in use');

    const [verification] = await this.db
      .select()
      .from(verifications)
      .where(eq(verifications.identifier, e164))
      .limit(1);

    if (!verification)
      throw new BadRequestException('No pending OTP — send OTP first');
    if (verification.expiresAt < new Date()) {
      await this.db
        .delete(verifications)
        .where(eq(verifications.id, verification.id));
      throw new BadRequestException('OTP expired');
    }

    const storedCode = (() => {
      try {
        const parsed = JSON.parse(verification.value) as Record<
          string,
          unknown
        >;
        const val = parsed['otp'] ?? parsed['code'];
        return typeof val === 'string' ? val : verification.value;
      } catch {
        return verification.value;
      }
    })();

    if (storedCode !== dto.code) throw new BadRequestException('Invalid OTP');

    await this.db
      .delete(verifications)
      .where(eq(verifications.id, verification.id));
    await this.db
      .update(users)
      .set({ phoneNumber: e164, phoneNumberVerified: true, phone: e164 })
      .where(eq(users.id, id));

    return { phoneNumber: e164 };
  }

  // ── Sessions ────────────────────────────────────────────────────────────

  @Get(':id/sessions')
  @ApiOperation({ summary: 'List active sessions for a user' })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  async getUserSessions(@Param('id') id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.db
      .select({
        id: sessions.id,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, id), gt(sessions.expiresAt, new Date())))
      .orderBy(desc(sessions.updatedAt));
  }

  @Delete(':id/sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all sessions for a user' })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  async revokeAllSessions(@Param('id') id: string) {
    await this.db.delete(sessions).where(eq(sessions.userId, id));
  }

  @Delete(':id/sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  @ApiParam({ name: 'sessionId', example: 'ses_01abc' })
  async revokeSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    await this.db
      .delete(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, id)));
  }

  // ── Organizations ───────────────────────────────────────────────────────

  @Get(':id/organizations')
  @ApiOperation({ summary: 'List organization memberships for a user' })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  async getUserOrganizations(@Param('id') id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.db.query.members.findMany({
      where: eq(members.userId, id),
      columns: { id: true, role: true, createdAt: true },
      with: {
        organization: {
          columns: {
            id: true,
            name: true,
            slug: true,
            type: true,
            isActive: true,
            logo: true,
          },
        },
      },
      orderBy: [desc(members.createdAt)],
    });
  }
}
