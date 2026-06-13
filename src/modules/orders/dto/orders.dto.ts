import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum CancelReason {
  CustomerRequest = 'customer_request',
  ItemUnavailable = 'item_unavailable',
  NoRider = 'no_rider',
  VendorBusy = 'vendor_busy',
  Other = 'other',
}

export class ConfirmOrderDto {
  @IsString()
  @IsOptional()
  estimatedMinutes?: string;
}

export class PrepareOrderDto {
  @IsString()
  @IsOptional()
  note?: string;
}

export class PickupCodeDto {
  @IsString()
  code!: string;
}

export class CancelOrderDto {
  @IsEnum(CancelReason)
  reason!: CancelReason;

  @IsString()
  @IsOptional()
  note?: string;
}

export class MarkItemUnavailableDto {
  @IsString()
  orderItemId!: string;
}

export class ProposeSwapDto {
  @IsString()
  orderItemId!: string;

  @IsString()
  proposedVariantId!: string;

  @IsString()
  @IsOptional()
  proposedTitle?: string;

  @IsString()
  @IsOptional()
  proposedImageR2Key?: string;
}

export class RespondSwapDto {
  @IsString()
  orderItemId!: string;

  @IsEnum(['accept', 'reject'] as const)
  action!: 'accept' | 'reject';
}
