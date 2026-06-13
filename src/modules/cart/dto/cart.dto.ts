import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ModifierSelectionDto {
  @IsString()
  modifierOptionId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class AddCartItemDto {
  @IsString()
  organizationId!: string;

  @IsString()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ModifierSelectionDto)
  modifiers?: ModifierSelectionDto[];
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  quantity!: number;
}

export class GuestLocationDto {
  @IsString()
  @IsOptional()
  guestName?: string;

  @IsString()
  @IsOptional()
  guestPhone?: string;

  @IsOptional()
  lat?: number;

  @IsOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  description?: string;
}
