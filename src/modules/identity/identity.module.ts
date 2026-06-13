import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { MeController } from './me.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  controllers: [OrganizationsController, MeController, AdminUsersController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class IdentityModule {}
