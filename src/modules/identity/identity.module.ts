import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { MeController } from './me.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminVendorsController } from './admin-vendors.controller';
import { StorageService } from '../../common/storage/storage.service';

@Module({
  controllers: [
    OrganizationsController,
    MeController,
    AdminUsersController,
    AdminVendorsController,
  ],
  providers: [OrganizationsService, StorageService],
  exports: [OrganizationsService],
})
export class IdentityModule {}
