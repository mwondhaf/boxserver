import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { VendorCatalogService } from './vendor-catalog.service';
import { StorageService } from '../../common/storage/storage.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateVariantDto,
  UpdateVariantDto,
  CreatePriceDto,
  CreateModifierGroupDto,
  CreateModifierOptionDto,
  CreateCollectionDto,
} from './dto/catalog.dto';

@Controller('vendor/catalog')
export class VendorCatalogController {
  constructor(
    private readonly catalogService: VendorCatalogService,
    private readonly storage: StorageService,
  ) {}

  @Get('products')
  listProducts(@Actor() actor: ActorContext) {
    return this.catalogService.listProducts(actor);
  }

  @Post('products')
  createProduct(@Actor() actor: ActorContext, @Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(actor, dto);
  }

  @Get('products/:id')
  getProduct(@Actor() actor: ActorContext, @Param('id') id: string) {
    return this.catalogService.getProduct(actor, id);
  }

  @Patch('products/:id')
  updateProduct(
    @Actor() actor: ActorContext,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalogService.updateProduct(actor, id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@Actor() actor: ActorContext, @Param('id') id: string) {
    return this.catalogService.deleteProduct(actor, id);
  }

  @Post('variants')
  createVariant(@Actor() actor: ActorContext, @Body() dto: CreateVariantDto) {
    return this.catalogService.createVariant(actor, dto);
  }

  @Patch('variants/:id')
  updateVariant(
    @Actor() actor: ActorContext,
    @Param('id') id: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.catalogService.updateVariant(actor, id, dto);
  }

  @Post('variants/:id/price')
  setVariantPrice(
    @Actor() actor: ActorContext,
    @Param('id') id: string,
    @Body() dto: CreatePriceDto,
  ) {
    return this.catalogService.setVariantPrice(actor, id, dto);
  }

  @Post('products/:id/image-upload')
  async getImageUploadUrl(
    @Actor() actor: ActorContext,
    @Param('id') productId: string,
    @Query('fileName') fileName: string,
    @Query('contentType') contentType: string,
  ) {
    return this.storage.getPresignedUploadUrl(
      `products/${productId}`,
      fileName,
      contentType,
    );
  }

  @Post('modifier-groups')
  createModifierGroup(
    @Actor() actor: ActorContext,
    @Body() dto: CreateModifierGroupDto,
  ) {
    return this.catalogService.createModifierGroup(actor, dto);
  }

  @Post('modifier-options')
  createModifierOption(
    @Actor() actor: ActorContext,
    @Body() dto: CreateModifierOptionDto,
  ) {
    return this.catalogService.createModifierOption(actor, dto);
  }

  @Get('collections')
  listCollections(@Actor() actor: ActorContext) {
    return this.catalogService.listCollections(actor);
  }

  @Post('collections')
  createCollection(
    @Actor() actor: ActorContext,
    @Body() dto: CreateCollectionDto,
  ) {
    return this.catalogService.createCollection(actor, dto);
  }
}
