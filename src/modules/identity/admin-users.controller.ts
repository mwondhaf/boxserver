import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { users } from '../../db/schema/identity';
import { RequireRole } from '../../auth/ability/policies.guard';
import { PoliciesGuard } from '../../auth/ability/policies.guard';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateUserRoleDto {
  @ApiProperty({ enum: ['customer', 'rider', 'admin'], example: 'admin' })
  @IsEnum(['customer', 'rider', 'admin'])
  platformRole!: 'customer' | 'rider' | 'admin';
}

@ApiTags('Admin — Users')
@ApiCookieAuth('session')
@RequireRole('admin')
@UseGuards(PoliciesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  @Get()
  @ApiOperation({ summary: 'List all users', description: 'Admin-only. Returns all registered users with their platform roles.' })
  @ApiResponse({ status: 200, description: 'Array of users' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  listUsers() {
    return this.db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        createdAt: true,
      },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  @ApiResponse({ status: 200, description: 'User record' })
  @ApiResponse({ status: 404, description: 'Not found' })
  getUser(@Param('id') id: string) {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        platformRole: true,
        createdAt: true,
      },
    });
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update user platform role', description: 'Promote a user to admin, grant rider access, or reset to customer.' })
  @ApiParam({ name: 'id', example: 'usr_01abc' })
  @ApiResponse({ status: 200, description: 'Updated user with new role' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    const [updated] = await this.db
      .update(users)
      .set({ platformRole: dto.platformRole })
      .where(eq(users.id, id))
      .returning({ id: users.id, platformRole: users.platformRole });
    return updated;
  }
}
