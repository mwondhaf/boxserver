import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Organic Matooke' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'organic-matooke' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ example: 'Fresh organic matooke from Mbarara farms' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'brand_01abc' })
  @IsString()
  @IsOptional()
  brandId?: string;

  @ApiPropertyOptional({ example: 'cat_01abc' })
  @IsString()
  @IsOptional()
  categoryId?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Organic Matooke (Updated)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateVariantDto {
  @ApiProperty({ example: 'prod_01abc' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: '1kg', description: 'Unit label shown to customers' })
  @IsString()
  unit!: string;

  @ApiPropertyOptional({ example: 'SKU-001' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: 1000, description: 'Weight in grams' })
  @IsInt()
  @IsOptional()
  weightGrams?: number;

  @ApiProperty({ example: 50, description: 'Available stock quantity (0 = out of stock)' })
  @IsInt()
  @Min(0)
  stockQuantity!: number;
}

export class UpdateVariantDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: 20 })
  @IsInt()
  @IsOptional()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ example: '2kg' })
  @IsString()
  @IsOptional()
  unit?: string;
}

export class CreatePriceDto {
  @ApiProperty({ example: 3500, description: 'Price in UGX (integer, no decimals)' })
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: 3000, description: 'Sale/discounted price in UGX' })
  @IsInt()
  @IsOptional()
  @Min(0)
  saleAmount?: number;

  @ApiPropertyOptional({ example: 'UGX' })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class CreateModifierGroupDto {
  @ApiProperty({ example: 'prod_01abc' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: 'Choose your sauce' })
  @IsString()
  name!: string;

  @ApiProperty({ example: true, description: 'Whether customer must select at least one option' })
  @IsBoolean()
  required!: boolean;

  @ApiProperty({ example: 1, description: 'Minimum number of selections' })
  @IsInt()
  @Min(0)
  minSelections!: number;

  @ApiProperty({ example: 2, description: 'Maximum number of selections' })
  @IsInt()
  @Min(1)
  maxSelections!: number;
}

export class CreateModifierOptionDto {
  @ApiProperty({ example: 'mg_01abc' })
  @IsString()
  modifierGroupId!: string;

  @ApiProperty({ example: 'Extra Chilli' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 500, description: 'Additional price in UGX (0 = free)' })
  @IsInt()
  priceAdd!: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}

export class CreateCollectionDto {
  @ApiProperty({ example: 'Weekend Deals' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'weekend-deals' })
  @IsString()
  @IsOptional()
  slug?: string;
}

export class StorefrontQueryDto {
  @ApiPropertyOptional({ example: 'cat_01abc', description: 'Filter by category ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'matooke', description: 'Search term for vendor/product name' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 0.3136, description: 'Customer latitude for proximity sorting' })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: 32.5811, description: 'Customer longitude for proximity sorting' })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ example: 20, description: 'Maximum results to return' })
  @IsInt()
  @IsOptional()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ example: 'cursor_xyz', description: 'Pagination cursor from previous response' })
  @IsString()
  @IsOptional()
  cursor?: string;
}
