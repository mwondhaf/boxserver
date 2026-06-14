import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModifierSelectionDto {
  @ApiProperty({ example: 'mopt_01abc', description: 'Modifier option ID' })
  @IsString()
  modifierOptionId!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class AddCartItemDto {
  @ApiProperty({ example: 'org_01abc', description: 'Vendor organisation ID' })
  @IsString()
  organizationId!: string;

  @ApiProperty({ example: 'var_01abc', description: 'Product variant ID' })
  @IsString()
  variantId!: string;

  @ApiProperty({ example: 2, description: 'Number of units to add' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    type: [ModifierSelectionDto],
    description: 'Modifier options selected by the customer',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ModifierSelectionDto)
  modifiers?: ModifierSelectionDto[];
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 3, description: 'New quantity. Set to 0 to remove the item.' })
  @IsInt()
  @Min(0)
  quantity!: number;
}

export class GuestLocationDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  guestName?: string;

  @ApiPropertyOptional({ example: '+256700000000' })
  @IsString()
  @IsOptional()
  guestPhone?: string;

  @ApiPropertyOptional({ example: 0.3136 })
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: 32.5811 })
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ example: 'Near the old Nakawa market' })
  @IsString()
  @IsOptional()
  description?: string;
}
