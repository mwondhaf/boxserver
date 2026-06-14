import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';
import { Public } from '../../auth/session.guard';
import { StorefrontQueryDto } from './dto/catalog.dto';

@ApiTags('Storefront (Public)')
@Public()
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('vendors')
  @ApiOperation({ summary: 'List vendors', description: 'Public. Returns active vendors, optionally filtered by category, search term, or location.' })
  @ApiResponse({ status: 200, description: 'Array of vendor organisations' })
  listVendors(@Query() query: StorefrontQueryDto) {
    return this.storefrontService.listVendors(query);
  }

  @Get('vendors/:slug')
  @ApiOperation({ summary: 'Get vendor by slug' })
  @ApiParam({ name: 'slug', example: 'kampala-fresh-market' })
  @ApiResponse({ status: 200, description: 'Vendor organisation details' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  getVendor(@Param('slug') slug: string) {
    return this.storefrontService.getVendor(slug);
  }

  @Get('vendors/:orgId/products')
  @ApiOperation({ summary: 'List products for a vendor', description: 'Returns approved, active products for a specific vendor.' })
  @ApiParam({ name: 'orgId', example: 'org_01abc' })
  @ApiResponse({ status: 200, description: 'Array of products with variants and prices' })
  listVendorProducts(
    @Param('orgId') orgId: string,
    @Query() query: StorefrontQueryDto,
  ) {
    return this.storefrontService.listVendorProducts(orgId, query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product by ID', description: 'Returns a single product with all variants, prices, and modifier groups.' })
  @ApiParam({ name: 'id', example: 'prod_01abc' })
  @ApiResponse({ status: 200, description: 'Product detail' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  getProduct(@Param('id') id: string) {
    return this.storefrontService.getProduct(id);
  }
}
