import { Module } from '@nestjs/common';
import { VendorCatalogService } from './vendor-catalog.service';
import { VendorCatalogController } from './vendor-catalog.controller';
import { StorefrontService } from './storefront.service';
import { StorefrontController } from './storefront.controller';
import { AdminCatalogController } from './admin-catalog.controller';
import { StorageService } from '../../common/storage/storage.service';

@Module({
  controllers: [
    StorefrontController,
    VendorCatalogController,
    AdminCatalogController,
  ],
  providers: [VendorCatalogService, StorefrontService, StorageService],
  exports: [VendorCatalogService, StorefrontService],
})
export class CatalogModule {}
