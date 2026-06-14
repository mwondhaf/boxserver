import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FulfillmentType {
  Delivery = 'delivery',
  Pickup = 'pickup',
  SelfDelivery = 'self_delivery',
}

export enum PaymentMethod {
  CashOnDelivery = 'cash_on_delivery',
  MobileMoney = 'mobile_money',
  Card = 'card',
  Wallet = 'wallet',
}

export class QuoteDto {
  @ApiProperty({ example: 'cart_01abc', description: 'Cart ID from POST /api/cart/org/:orgId' })
  @IsString()
  cartId!: string;

  @ApiProperty({ enum: FulfillmentType, example: FulfillmentType.Delivery })
  @IsEnum(FulfillmentType)
  fulfillmentType!: FulfillmentType;

  @ApiPropertyOptional({ example: 'addr_01abc', description: 'Saved customer address ID (used when customerAddress is known)' })
  @IsString()
  @IsOptional()
  customerAddressId?: string;

  @ApiPropertyOptional({ example: 'quote_01abc', description: 'Pre-computed delivery quote ID from POST /api/quotes' })
  @IsString()
  @IsOptional()
  deliveryQuoteId?: string;

  @ApiPropertyOptional({ example: 0.3136, description: 'Drop-off latitude (alternative to customerAddressId)' })
  @IsNumber()
  @IsOptional()
  deliveryLat?: number;

  @ApiPropertyOptional({ example: 32.5811, description: 'Drop-off longitude (alternative to customerAddressId)' })
  @IsNumber()
  @IsOptional()
  deliveryLng?: number;

  @ApiPropertyOptional({ example: 'WELCOME10', description: 'Promotion / discount code' })
  @IsString()
  @IsOptional()
  promotionCode?: string;
}

export class PlaceOrderDto {
  @ApiProperty({ example: 'cart_01abc' })
  @IsString()
  cartId!: string;

  @ApiProperty({ enum: FulfillmentType, example: FulfillmentType.Delivery })
  @IsEnum(FulfillmentType)
  fulfillmentType!: FulfillmentType;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.MobileMoney })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ example: 'addr_01abc' })
  @IsString()
  @IsOptional()
  customerAddressId?: string;

  @ApiPropertyOptional({ example: 'quote_01abc' })
  @IsString()
  @IsOptional()
  deliveryQuoteId?: string;

  @ApiPropertyOptional({ example: 0.3136 })
  @IsNumber()
  @IsOptional()
  deliveryLat?: number;

  @ApiPropertyOptional({ example: 32.5811 })
  @IsNumber()
  @IsOptional()
  deliveryLng?: number;

  @ApiPropertyOptional({ example: 'Jane Guest', description: 'Name for guest/unregistered checkout' })
  @IsString()
  @IsOptional()
  guestName?: string;

  @ApiPropertyOptional({ example: '+256700000000', description: 'Phone for guest checkout' })
  @IsString()
  @IsOptional()
  guestPhone?: string;

  @ApiPropertyOptional({ example: 'WELCOME10' })
  @IsString()
  @IsOptional()
  promotionCode?: string;

  @ApiPropertyOptional({ example: '+256700000000', description: 'Mobile money phone — required when paymentMethod is mobile_money' })
  @IsString()
  @IsOptional()
  mobileMoneyPhone?: string;
}
