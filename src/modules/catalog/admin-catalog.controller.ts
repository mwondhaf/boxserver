import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { products, productVariants } from '../../db/schema/catalog';
import {
  categories,
  categoryPricingRules,
  brands,
} from '../../db/schema/categories';
import { RequireRole, PoliciesGuard } from '../../auth/ability/policies.guard';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

class ApproveProductDto {
  @ApiProperty({ example: true, description: 'true = approve, false = revoke approval' })
  @IsBoolean()
  isApproved!: boolean;
}

class CreateCategoryDto {
  @ApiProperty({ example: 'Groceries' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'groceries' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ example: 'cat_parent_01', description: 'Parent category ID for sub-categories' })
  @IsString()
  @IsOptional()
  parentId?: string;
}

class CreateCategoryPricingRuleDto {
  @ApiProperty({ example: 'cat_01abc' })
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: 15, description: 'Markup percentage applied to products in this category' })
  @IsInt()
  @Min(0)
  markupPercentage!: number;
}

class CreateBrandDto {
  @ApiProperty({ example: 'Jesa Farm Dairy' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'jesa-farm-dairy' })
  @IsString()
  slug!: string;
}

@ApiTags('Admin — Catalog')
@ApiCookieAuth('session')
@RequireRole('admin')
@UseGuards(PoliciesGuard)
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  @Get('products')
  @ApiOperation({ summary: 'List all products', description: 'Admin view — includes unapproved products from all vendors.' })
  @ApiResponse({ status: 200, description: 'Array of products' })
  listProducts() {
    return this.db.query.products.findMany({
      with: { images: true, category: true },
    });
  }

  @Patch('products/:id/approve')
  @ApiOperation({ summary: 'Approve or revoke a product', description: 'Approved products become visible on the customer storefront.' })
  @ApiParam({ name: 'id', example: 'prod_01abc' })
  @ApiResponse({ status: 200, description: 'Updated product' })
  async approveProduct(@Param('id') id: string, @Body() dto: ApproveProductDto) {
    const [updated] = await this.db
      .update(products)
      .set({ isApproved: dto.isApproved })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  @Patch('variants/:id/approve')
  @ApiOperation({ summary: 'Approve or revoke a variant', description: 'Approved variants can be purchased by customers.' })
  @ApiParam({ name: 'id', example: 'var_01abc' })
  @ApiResponse({ status: 200, description: 'Updated variant' })
  async approveVariant(@Param('id') id: string, @Body() dto: ApproveProductDto) {
    const [updated] = await this.db
      .update(productVariants)
      .set({ isApproved: dto.isApproved })
      .where(eq(productVariants.id, id))
      .returning();
    return updated;
  }

  @Get('categories')
  @ApiOperation({ summary: 'List categories', description: 'Returns all categories with their associated markup pricing rules.' })
  @ApiResponse({ status: 200, description: 'Array of categories' })
  listCategories() {
    return this.db.query.categories.findMany({
      with: { pricingRules: true },
    });
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a category' })
  @ApiResponse({ status: 201, description: 'Created category' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    const [category] = await this.db
      .insert(categories)
      .values(dto)
      .returning();
    return category;
  }

  @Post('category-pricing-rules')
  @ApiOperation({ summary: 'Create a category pricing rule', description: 'Defines a markup percentage applied to all products in a category.' })
  @ApiResponse({ status: 201, description: 'Created pricing rule' })
  async createCategoryPricingRule(@Body() dto: CreateCategoryPricingRuleDto) {
    const [rule] = await this.db
      .insert(categoryPricingRules)
      .values(dto)
      .returning();
    return rule;
  }

  @Get('brands')
  @ApiOperation({ summary: 'List brands' })
  @ApiResponse({ status: 200, description: 'Array of brands' })
  listBrands() {
    return this.db.query.brands.findMany();
  }

  @Post('brands')
  @ApiOperation({ summary: 'Create a brand' })
  @ApiResponse({ status: 201, description: 'Created brand' })
  async createBrand(@Body() dto: CreateBrandDto) {
    const [brand] = await this.db.insert(brands).values(dto).returning();
    return brand;
  }
}
