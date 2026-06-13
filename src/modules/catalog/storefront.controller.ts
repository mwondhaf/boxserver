import { Controller, Get, Param, Query } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { Public } from '../../auth/session.guard';
import { StorefrontQueryDto } from './dto/catalog.dto';

@Public()
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('vendors')
  listVendors(@Query() query: StorefrontQueryDto) {
    return this.storefrontService.listVendors(query);
  }

  @Get('vendors/:slug')
  getVendor(@Param('slug') slug: string) {
    return this.storefrontService.getVendor(slug);
  }

  @Get('vendors/:orgId/products')
  listVendorProducts(
    @Param('orgId') orgId: string,
    @Query() query: StorefrontQueryDto,
  ) {
    return this.storefrontService.listVendorProducts(orgId, query);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.storefrontService.getProduct(id);
  }
}
