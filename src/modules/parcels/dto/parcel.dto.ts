import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ParcelSizeCategory {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  ExtraLarge = 'extra_large',
}

export class CreateParcelDto {
  @ApiProperty({ example: 'Sarah Nakato', description: 'Name of person at pickup point' })
  @IsString() pickupName!: string;

  @ApiProperty({ example: '+256700000000' })
  @IsString() pickupPhone!: string;

  @ApiProperty({ example: 'Plot 12 Jinja Road, Nakawa' })
  @IsString() pickupAddress!: string;

  @ApiProperty({ example: 0.3136, description: 'Pickup latitude (-90 to 90)' })
  @IsNumber() @Min(-90) @Max(90) pickupLat!: number;

  @ApiProperty({ example: 32.5811, description: 'Pickup longitude (-180 to 180)' })
  @IsNumber() @Min(-180) @Max(180) pickupLng!: number;

  @ApiPropertyOptional({ example: 'Gate is on the left side' })
  @IsString() @IsOptional() pickupNotes?: string;

  @ApiProperty({ example: 'John Mugisha', description: 'Name of recipient at drop-off' })
  @IsString() dropoffName!: string;

  @ApiProperty({ example: '+256711000000' })
  @IsString() dropoffPhone!: string;

  @ApiProperty({ example: 'Kira Road, Bukoto' })
  @IsString() dropoffAddress!: string;

  @ApiProperty({ example: 0.3560, description: 'Drop-off latitude (-90 to 90)' })
  @IsNumber() @Min(-90) @Max(90) dropoffLat!: number;

  @ApiProperty({ example: 32.5960, description: 'Drop-off longitude (-180 to 180)' })
  @IsNumber() @Min(-180) @Max(180) dropoffLng!: number;

  @ApiPropertyOptional({ example: 'Call before coming' })
  @IsString() @IsOptional() dropoffNotes?: string;

  @ApiProperty({ enum: ParcelSizeCategory, example: ParcelSizeCategory.Small, description: 'small (<1 kg), medium (1-5 kg), large (5-20 kg), extra_large (>20 kg)' })
  @IsEnum(ParcelSizeCategory) sizeCategory!: ParcelSizeCategory;

  @ApiPropertyOptional({ example: 'Electronics — handle with care' })
  @IsString() @IsOptional() description?: string;

  @ApiPropertyOptional({ example: 50000, description: 'Declared value in UGX for insurance purposes' })
  @IsNumber() @IsOptional() @Min(0) declaredValue?: number;

  @ApiPropertyOptional({ example: 'quote_01abc', description: 'Pre-computed delivery quote ID' })
  @IsString() @IsOptional() deliveryQuoteId?: string;

  @ApiPropertyOptional({ example: 'mobile_money' })
  @IsString() @IsOptional() paymentMethod?: string;

  @ApiPropertyOptional({ example: '+256700000000' })
  @IsString() @IsOptional() paymentPhone?: string;
}

export class CancelParcelDto {
  @ApiProperty({ example: 'Recipient unavailable' })
  @IsString() reason!: string;
}
