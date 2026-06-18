import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { eq } from 'drizzle-orm';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import slugify from 'slugify';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import {
  products,
  productVariants,
  productImages,
} from '../../db/schema/catalog';
import {
  categories,
  categoryPricingRules,
  brands,
} from '../../db/schema/categories';
import { RequireRole } from '../../auth/casl/policies.guard';
import { StorageService } from '../../common/storage/storage.service';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class ApproveProductDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isApproved!: boolean;
}

class AdminCreateProductDto {
  @ApiProperty({ example: 'Organic Matooke' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brandId?: string;

  @ApiPropertyOptional({ example: ['organic', 'fresh'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

class CreateCategoryDto {
  @ApiProperty({ example: 'Groceries' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thumbnailR2Key?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bannerR2Key?: string;
}

class CreateCategoryPricingRuleDto {
  @ApiProperty({ example: 'cat_01abc' })
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: 15 })
  @IsInt()
  @Min(0)
  markupPercentage!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

class CreateBrandDto {
  @ApiProperty({ example: 'Jesa Farm Dairy' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

class UpdateBrandDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logoR2Key?: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Admin — Catalog')
@ApiCookieAuth('session')
@RequireRole('admin')
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly storage: StorageService,
  ) {}

  // ── Products ────────────────────────────────────────────────────────────────

  @Get('products')
  @ApiOperation({ summary: 'List all products' })
  async listProducts() {
    const rows = await this.db.query.products.findMany({
      with: { images: true, category: true },
    });
    return rows.map((p) => ({
      ...p,
      images: p.images.map((img) => ({
        ...img,
        publicUrl: this.storage.getPublicUrl(img.r2Key),
      })),
    }));
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a platform product' })
  async createProduct(@Body() dto: AdminCreateProductDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const [product] = await this.db
      .insert(products)
      .values({ ...dto, slug, organizationId: null })
      .returning();
    return product;
  }

  @Patch('products/:id/approve')
  @ApiOperation({ summary: 'Approve or revoke a product' })
  @ApiParam({ name: 'id' })
  async approveProduct(
    @Param('id') id: string,
    @Body() dto: ApproveProductDto,
  ) {
    const [updated] = await this.db
      .update(products)
      .set({ isApproved: dto.isApproved })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  // ── Product images ──────────────────────────────────────────────────────────

  @Post('products/:id/images')
  @ApiOperation({ summary: 'Upload a product image' })
  @ApiParam({ name: 'id' })
  @UseInterceptors(FileInterceptor('file'))
  async addProductImage(
    @Param('id') productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { r2Key, publicUrl } = await this.storage.uploadFile(
      `products/${productId}`,
      file,
    );

    const existing = await this.db.query.productImages.findFirst({
      where: eq(productImages.productId, productId),
    });
    const isPrimary = !existing;

    const [image] = await this.db
      .insert(productImages)
      .values({ productId, r2Key, isPrimary })
      .returning();
    if (!image) throw new Error('Failed to insert image');
    return { ...image, publicUrl };
  }

  @Patch('images/:imageId/primary')
  @ApiOperation({ summary: 'Set a product image as primary' })
  @ApiParam({ name: 'imageId' })
  async setProductImagePrimary(@Param('imageId') imageId: string) {
    const image = await this.db.query.productImages.findFirst({
      where: eq(productImages.id, imageId),
    });
    if (!image) return null;
    await this.db
      .update(productImages)
      .set({ isPrimary: false })
      .where(eq(productImages.productId, image.productId));
    const [updated] = await this.db
      .update(productImages)
      .set({ isPrimary: true })
      .where(eq(productImages.id, imageId))
      .returning();
    if (!updated) return null;
    return { ...updated, publicUrl: this.storage.getPublicUrl(updated.r2Key) };
  }

  @Delete('images/:imageId')
  @ApiOperation({ summary: 'Delete a product image' })
  @ApiParam({ name: 'imageId' })
  async deleteProductImage(@Param('imageId') imageId: string) {
    const image = await this.db.query.productImages.findFirst({
      where: eq(productImages.id, imageId),
    });
    if (image) {
      await this.storage.deleteObject(image.r2Key);
      await this.db.delete(productImages).where(eq(productImages.id, imageId));
    }
    return { success: true };
  }

  // ── Variants ────────────────────────────────────────────────────────────────

  @Get('variants')
  @ApiOperation({ summary: 'List all variant listings across vendors' })
  async listVariants() {
    const variants = await this.db.query.productVariants.findMany({
      with: {
        product: { with: { images: true } },
        priceSet: { with: { amounts: true } },
        organization: true,
      },
    });

    return variants.map((v) => {
      const primaryImage =
        v.product?.images?.find((img) => img.isPrimary) ??
        v.product?.images?.[0];
      return {
        ...v,
        product: v.product
          ? {
              id: v.product.id,
              name: v.product.name,
              imageUrl: primaryImage?.r2Key
                ? this.storage.getPublicUrl(primaryImage.r2Key)
                : null,
            }
          : null,
        organization: v.organization
          ? { id: v.organization.id, name: v.organization.name }
          : null,
      };
    });
  }

  @Patch('variants/:id/approve')
  @ApiOperation({ summary: 'Approve or revoke a variant' })
  @ApiParam({ name: 'id' })
  async approveVariant(
    @Param('id') id: string,
    @Body() dto: ApproveProductDto,
  ) {
    const [updated] = await this.db
      .update(productVariants)
      .set({ isApproved: dto.isApproved })
      .where(eq(productVariants.id, id))
      .returning();
    return updated;
  }

  // ── Categories ──────────────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List categories with enriched data' })
  async listCategories() {
    const rows = await this.db.query.categories.findMany({
      with: { pricingRules: true },
    });

    const childrenCounts = new Map<string, number>();
    for (const cat of rows) {
      if (cat.parentId) {
        childrenCounts.set(
          cat.parentId,
          (childrenCounts.get(cat.parentId) ?? 0) + 1,
        );
      }
    }

    const categoryMap = new Map(rows.map((c) => [c.id, c.name]));

    return rows.map((cat) => ({
      ...cat,
      thumbnailUrl: cat.thumbnailR2Key
        ? this.storage.getPublicUrl(cat.thumbnailR2Key)
        : null,
      bannerUrl: cat.bannerR2Key
        ? this.storage.getPublicUrl(cat.bannerR2Key)
        : null,
      parentName: cat.parentId ? (categoryMap.get(cat.parentId) ?? null) : null,
      childrenCount: childrenCounts.get(cat.id) ?? 0,
    }));
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a category' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const [category] = await this.db
      .insert(categories)
      .values({ ...dto, slug })
      .returning();
    return category;
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const updates: Partial<typeof dto & { slug?: string }> = { ...dto };
    if (dto.name) {
      updates.slug = slugify(dto.name, { lower: true, strict: true });
    }
    const [updated] = await this.db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  @Post('categories/:id/images/:imageType')
  @ApiOperation({ summary: 'Upload a category thumbnail or banner image' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'imageType', enum: ['thumbnail', 'banner'] })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCategoryImage(
    @Param('id') categoryId: string,
    @Param('imageType') imageType: 'thumbnail' | 'banner',
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { r2Key, publicUrl } = await this.storage.uploadFile(
      `categories/${categoryId}/${imageType}`,
      file,
    );

    const existing = await this.db.query.categories.findFirst({
      where: eq(categories.id, categoryId),
    });
    if (existing) {
      const oldKey =
        imageType === 'thumbnail'
          ? existing.thumbnailR2Key
          : existing.bannerR2Key;
      if (oldKey) await this.storage.deleteObject(oldKey);
    }

    const update =
      imageType === 'thumbnail'
        ? { thumbnailR2Key: r2Key }
        : { bannerR2Key: r2Key };
    await this.db
      .update(categories)
      .set(update)
      .where(eq(categories.id, categoryId));

    return { r2Key, publicUrl };
  }

  @Delete('categories/:id/images/:imageType')
  @ApiOperation({ summary: 'Remove a category image (thumbnail or banner)' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'imageType', enum: ['thumbnail', 'banner'] })
  async deleteCategoryImage(
    @Param('id') categoryId: string,
    @Param('imageType') imageType: 'thumbnail' | 'banner',
  ) {
    const category = await this.db.query.categories.findFirst({
      where: eq(categories.id, categoryId),
    });
    if (category) {
      const r2Key =
        imageType === 'thumbnail'
          ? category.thumbnailR2Key
          : category.bannerR2Key;
      if (r2Key) await this.storage.deleteObject(r2Key);
    }
    const update =
      imageType === 'thumbnail'
        ? { thumbnailR2Key: null as unknown as string }
        : { bannerR2Key: null as unknown as string };
    await this.db
      .update(categories)
      .set(update)
      .where(eq(categories.id, categoryId));
    return { success: true };
  }

  @Post('category-pricing-rules')
  @ApiOperation({ summary: 'Create a category pricing rule' })
  async createCategoryPricingRule(@Body() dto: CreateCategoryPricingRuleDto) {
    const [rule] = await this.db
      .insert(categoryPricingRules)
      .values(dto)
      .returning();
    return rule;
  }

  // ── Brands ──────────────────────────────────────────────────────────────────

  @Get('brands')
  @ApiOperation({ summary: 'List brands' })
  async listBrands() {
    const rows = await this.db.query.brands.findMany();
    return rows.map((b) => ({
      ...b,
      logoUrl: b.logoR2Key ? this.storage.getPublicUrl(b.logoR2Key) : null,
    }));
  }

  @Post('brands')
  @ApiOperation({ summary: 'Create a brand' })
  async createBrand(@Body() dto: CreateBrandDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const [brand] = await this.db
      .insert(brands)
      .values({ ...dto, slug })
      .returning();
    return brand;
  }

  @Patch('brands/:id')
  @ApiOperation({ summary: 'Update a brand' })
  @ApiParam({ name: 'id' })
  async updateBrand(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    const updates: Partial<typeof dto & { slug?: string }> = { ...dto };
    if (dto.name) {
      updates.slug = slugify(dto.name, { lower: true, strict: true });
    }
    const [updated] = await this.db
      .update(brands)
      .set(updates)
      .where(eq(brands.id, id))
      .returning();
    return updated;
  }

  @Post('brands/:id/logo')
  @ApiOperation({ summary: 'Upload a brand logo' })
  @ApiParam({ name: 'id' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadBrandLogo(
    @Param('id') brandId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { r2Key, publicUrl } = await this.storage.uploadFile(
      `brands/${brandId}`,
      file,
    );

    const existing = await this.db.query.brands.findFirst({
      where: eq(brands.id, brandId),
    });
    if (existing?.logoR2Key)
      await this.storage.deleteObject(existing.logoR2Key);

    await this.db
      .update(brands)
      .set({ logoR2Key: r2Key })
      .where(eq(brands.id, brandId));

    return { r2Key, logoUrl: publicUrl };
  }

  @Delete('brands/:id/image')
  @ApiOperation({ summary: 'Remove a brand logo' })
  @ApiParam({ name: 'id' })
  async deleteBrandImage(@Param('id') brandId: string) {
    const brand = await this.db.query.brands.findFirst({
      where: eq(brands.id, brandId),
    });
    if (brand?.logoR2Key) await this.storage.deleteObject(brand.logoR2Key);
    await this.db
      .update(brands)
      .set({ logoR2Key: null })
      .where(eq(brands.id, brandId));
    return { success: true };
  }
}
