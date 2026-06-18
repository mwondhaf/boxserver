import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CancelReason {
  CustomerRequest = 'customer_request',
  ItemUnavailable = 'item_unavailable',
  NoRider = 'no_rider',
  VendorBusy = 'vendor_busy',
  Other = 'other',
}

export class ConfirmOrderDto {
  @ApiPropertyOptional({
    example: '25',
    description: 'Estimated preparation time in minutes',
  })
  @IsString()
  @IsOptional()
  estimatedMinutes?: string;
}

export class PrepareOrderDto {
  @ApiPropertyOptional({ example: 'Bagging the items now' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class PickupCodeDto {
  @ApiProperty({
    example: '4821',
    description: 'Pickup code shown to the rider / customer',
  })
  @IsString()
  code!: string;
}

export class CancelOrderDto {
  @ApiProperty({ enum: CancelReason, example: CancelReason.CustomerRequest })
  @IsEnum(CancelReason)
  reason!: CancelReason;

  @ApiPropertyOptional({ example: 'Changed my mind' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class MarkItemUnavailableDto {
  @ApiProperty({
    example: 'item_01abc',
    description: 'Order item ID to mark as unavailable',
  })
  @IsString()
  orderItemId!: string;
}

export class ProposeSwapDto {
  @ApiProperty({ example: 'item_01abc' })
  @IsString()
  orderItemId!: string;

  @ApiProperty({ example: 'var_01xyz', description: 'Replacement variant ID' })
  @IsString()
  proposedVariantId!: string;

  @ApiPropertyOptional({ example: 'Organic Tomatoes 500g' })
  @IsString()
  @IsOptional()
  proposedTitle?: string;

  @ApiPropertyOptional({
    example: 'products/var_01xyz/image.jpg',
    description: 'R2 storage key for replacement item image',
  })
  @IsString()
  @IsOptional()
  proposedImageR2Key?: string;
}

export class RespondSwapDto {
  @ApiProperty({ example: 'item_01abc' })
  @IsString()
  orderItemId!: string;

  @ApiProperty({
    enum: ['accept', 'reject'],
    example: 'accept',
    description: 'Accept or reject the vendor swap proposal',
  })
  @IsEnum(['accept', 'reject'] as const)
  action!: 'accept' | 'reject';
}
