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

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateVariantDto {
  @IsString()
  productId!: string;

  @IsString()
  unit!: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsInt()
  @IsOptional()
  weightGrams?: number;

  @IsInt()
  @Min(0)
  stockQuantity!: number;
}

export class UpdateVariantDto {
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  stockQuantity?: number;

  @IsString()
  @IsOptional()
  unit?: string;
}

export class CreatePriceDto {
  @IsInt()
  @Min(0)
  amount!: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  saleAmount?: number;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class CreateModifierGroupDto {
  @IsString()
  productId!: string;

  @IsString()
  name!: string;

  @IsBoolean()
  required!: boolean;

  @IsInt()
  @Min(0)
  minSelections!: number;

  @IsInt()
  @Min(1)
  maxSelections!: number;
}

export class CreateModifierOptionDto {
  @IsString()
  modifierGroupId!: string;

  @IsString()
  name!: string;

  @IsInt()
  priceAdd!: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}

export class CreateCollectionDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  slug?: string;
}

export class StorefrontQueryDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  limit?: number;

  @IsString()
  @IsOptional()
  cursor?: string;
}
