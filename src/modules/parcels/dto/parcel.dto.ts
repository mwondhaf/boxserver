import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum ParcelSizeCategory {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  ExtraLarge = 'extra_large',
}

export class CreateParcelDto {
  @IsString() pickupName!: string;
  @IsString() pickupPhone!: string;
  @IsString() pickupAddress!: string;
  @IsNumber() @Min(-90) @Max(90) pickupLat!: number;
  @IsNumber() @Min(-180) @Max(180) pickupLng!: number;
  @IsString() @IsOptional() pickupNotes?: string;

  @IsString() dropoffName!: string;
  @IsString() dropoffPhone!: string;
  @IsString() dropoffAddress!: string;
  @IsNumber() @Min(-90) @Max(90) dropoffLat!: number;
  @IsNumber() @Min(-180) @Max(180) dropoffLng!: number;
  @IsString() @IsOptional() dropoffNotes?: string;

  @IsEnum(ParcelSizeCategory) sizeCategory!: ParcelSizeCategory;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @IsOptional() @Min(0) declaredValue?: number;
  @IsString() @IsOptional() deliveryQuoteId?: string;
  @IsString() @IsOptional() paymentMethod?: string;
  @IsString() @IsOptional() paymentPhone?: string;
}

export class CancelParcelDto {
  @IsString() reason!: string;
}
