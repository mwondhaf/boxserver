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
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { users } from '../../db/schema/identity';
import { RequireRole } from '../../auth/ability/policies.guard';
import { PoliciesGuard } from '../../auth/ability/policies.guard';
import { IsEnum, IsOptional } from 'class-validator';

class UpdateUserRoleDto {
  @IsEnum(['customer', 'rider', 'admin'])
  platformRole!: 'customer' | 'rider' | 'admin';
}

@RequireRole('admin')
@UseGuards(PoliciesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  @Get()
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
  async updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    const [updated] = await this.db
      .update(users)
      .set({ platformRole: dto.platformRole })
      .where(eq(users.id, id))
      .returning({ id: users.id, platformRole: users.platformRole });
    return updated;
  }
}
