import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VendorCatalogService } from './vendor-catalog.service';
import { StorageService } from '../../common/storage/storage.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateVariantDto,
  UpdateVariantDto,
  SetVariantPricesDto,
  CreateModifierGroupDto,
  CreateModifierOptionDto,
  CreateCollectionDto,
} from './dto/catalog.dto';

@ApiTags('Vendor — Catalog')
@ApiCookieAuth('session')
@Controller('vendor/catalog')
export class VendorCatalogController {
  constructor(
    private readonly catalogService: VendorCatalogService,
    private readonly storage: StorageService,
  ) {}

  @Get('variants')
  @ApiOperation({
    summary: 'List my listings',
    description:
      "Returns all product variants (listings) belonging to the authenticated vendor's organisation.",
  })
  @ApiResponse({ status: 200, description: 'Array of variant listings' })
  listVariants(@Actor() actor: ActorContext) {
    return this.catalogService.listVariants(actor);
  }

  @Delete('variants/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a variant listing' })
  @ApiParam({ name: 'id', example: 'var_01abc' })
  @ApiResponse({ status: 200, description: 'Deletion confirmation' })
  deleteVariant(@Actor() actor: ActorContext, @Param('id') id: string) {
    return this.catalogService.deleteVariant(actor, id);
  }

  @Get('products')
  @ApiOperation({
    summary: 'List my products',
    description:
      "Returns the vendor's own products plus approved platform products available for listing.",
  })
  @ApiResponse({ status: 200, description: 'Array of products' })
  listProducts(@Actor() actor: ActorContext) {
    return this.catalogService.listProducts(actor);
  }

  @Post('products')
  @ApiOperation({
    summary: 'Create a product',
    description:
      'Creates a new product. The product must be approved by an admin before it appears on the storefront.',
  })
  @ApiResponse({ status: 201, description: 'Created product' })
  createProduct(@Actor() actor: ActorContext, @Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(actor, dto);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', example: 'prod_01abc' })
  @ApiResponse({ status: 200, description: 'Product detail' })
  getProduct(@Actor() actor: ActorContext, @Param('id') id: string) {
    return this.catalogService.getProduct(actor, id);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', example: 'prod_01abc' })
  @ApiResponse({ status: 200, description: 'Updated product' })
  updateProduct(
    @Actor() actor: ActorContext,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalogService.updateProduct(actor, id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', example: 'prod_01abc' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  deleteProduct(@Actor() actor: ActorContext, @Param('id') id: string) {
    return this.catalogService.deleteProduct(actor, id);
  }

  @Post('variants')
  @ApiOperation({
    summary: 'Create a product variant',
    description:
      'A variant represents a specific unit/size of a product (e.g. "1kg" or "500g"). Set price separately via POST /vendor/catalog/variants/:id/price.',
  })
  @ApiResponse({ status: 201, description: 'Created variant' })
  createVariant(@Actor() actor: ActorContext, @Body() dto: CreateVariantDto) {
    return this.catalogService.createVariant(actor, dto);
  }

  @Patch('variants/:id')
  @ApiOperation({ summary: 'Update a variant' })
  @ApiParam({ name: 'id', example: 'var_01abc' })
  @ApiResponse({ status: 200, description: 'Updated variant' })
  updateVariant(
    @Actor() actor: ActorContext,
    @Param('id') id: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.catalogService.updateVariant(actor, id, dto);
  }

  @Post('variants/:id/price')
  @ApiOperation({
    summary: 'Set variant prices',
    description:
      'Replaces the full set of price tiers for a variant. Provide a single tier for simple pricing or multiple tiers for quantity-based pricing. Amounts are in UGX (integer, no decimals).',
  })
  @ApiParam({ name: 'id', example: 'var_01abc' })
  @ApiResponse({ status: 201, description: 'Price records' })
  setVariantPrice(
    @Actor() actor: ActorContext,
    @Param('id') id: string,
    @Body() dto: SetVariantPricesDto,
  ) {
    return this.catalogService.setVariantPrice(actor, id, dto);
  }

  @Post('products/:id/images')
  @ApiOperation({ summary: 'Upload a product image' })
  @ApiParam({ name: 'id', example: 'prod_01abc' })
  @ApiResponse({ status: 201, description: 'Uploaded image with publicUrl' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @Actor() actor: ActorContext,
    @Param('id') productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    void actor;
    return this.storage.uploadFile(`products/${productId}`, file);
  }

  @Post('modifier-groups')
  @ApiOperation({
    summary: 'Create a modifier group',
    description:
      'Modifier groups allow customers to customise their order (e.g. "Choose your sauce"). Attach options via POST /vendor/catalog/modifier-options.',
  })
  @ApiResponse({ status: 201, description: 'Created modifier group' })
  createModifierGroup(
    @Actor() actor: ActorContext,
    @Body() dto: CreateModifierGroupDto,
  ) {
    return this.catalogService.createModifierGroup(actor, dto);
  }

  @Post('modifier-options')
  @ApiOperation({
    summary: 'Create a modifier option',
    description:
      'Adds a selectable option to an existing modifier group. priceAdd can be 0 for free options.',
  })
  @ApiResponse({ status: 201, description: 'Created modifier option' })
  createModifierOption(
    @Actor() actor: ActorContext,
    @Body() dto: CreateModifierOptionDto,
  ) {
    return this.catalogService.createModifierOption(actor, dto);
  }

  @Get('collections')
  @ApiOperation({ summary: 'List product collections' })
  @ApiResponse({ status: 200, description: 'Array of collections' })
  listCollections(@Actor() actor: ActorContext) {
    return this.catalogService.listCollections(actor);
  }

  @Post('collections')
  @ApiOperation({
    summary: 'Create a product collection',
    description:
      'Collections let vendors group products (e.g. "Weekend Deals", "New Arrivals").',
  })
  @ApiResponse({ status: 201, description: 'Created collection' })
  createCollection(
    @Actor() actor: ActorContext,
    @Body() dto: CreateCollectionDto,
  ) {
    return this.catalogService.createCollection(actor, dto);
  }
}
