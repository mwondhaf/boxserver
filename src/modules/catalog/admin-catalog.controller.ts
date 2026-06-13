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
  @IsBoolean()
  isApproved!: boolean;
}

class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}

class CreateCategoryPricingRuleDto {
  @IsString()
  categoryId!: string;

  @IsInt()
  @Min(0)
  markupPercentage!: number;
}

class CreateBrandDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;
}

@RequireRole('admin')
@UseGuards(PoliciesGuard)
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  @Get('products')
  listProducts() {
    return this.db.query.products.findMany({
      with: { images: true, category: true },
    });
  }

  @Patch('products/:id/approve')
  async approveProduct(@Param('id') id: string, @Body() dto: ApproveProductDto) {
    const [updated] = await this.db
      .update(products)
      .set({ isApproved: dto.isApproved })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  @Patch('variants/:id/approve')
  async approveVariant(@Param('id') id: string, @Body() dto: ApproveProductDto) {
    const [updated] = await this.db
      .update(productVariants)
      .set({ isApproved: dto.isApproved })
      .where(eq(productVariants.id, id))
      .returning();
    return updated;
  }

  // Categories
  @Get('categories')
  listCategories() {
    return this.db.query.categories.findMany({
      with: { pricingRules: true },
    });
  }

  @Post('categories')
  async createCategory(@Body() dto: CreateCategoryDto) {
    const [category] = await this.db
      .insert(categories)
      .values(dto)
      .returning();
    return category;
  }

  // Category pricing rules
  @Post('category-pricing-rules')
  async createCategoryPricingRule(@Body() dto: CreateCategoryPricingRuleDto) {
    const [rule] = await this.db
      .insert(categoryPricingRules)
      .values(dto)
      .returning();
    return rule;
  }

  // Brands
  @Get('brands')
  listBrands() {
    return this.db.query.brands.findMany();
  }

  @Post('brands')
  async createBrand(@Body() dto: CreateBrandDto) {
    const [brand] = await this.db.insert(brands).values(dto).returning();
    return brand;
  }
}
