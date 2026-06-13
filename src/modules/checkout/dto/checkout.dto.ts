import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
} from 'class-validator';

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
  @IsString()
  cartId!: string;

  @IsEnum(FulfillmentType)
  fulfillmentType!: FulfillmentType;

  @IsString()
  @IsOptional()
  customerAddressId?: string;

  @IsString()
  @IsOptional()
  deliveryQuoteId?: string;

  @IsNumber()
  @IsOptional()
  deliveryLat?: number;

  @IsNumber()
  @IsOptional()
  deliveryLng?: number;

  @IsString()
  @IsOptional()
  promotionCode?: string;
}

export class PlaceOrderDto {
  @IsString()
  cartId!: string;

  @IsEnum(FulfillmentType)
  fulfillmentType!: FulfillmentType;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsString()
  @IsOptional()
  customerAddressId?: string;

  @IsString()
  @IsOptional()
  deliveryQuoteId?: string;

  @IsNumber()
  @IsOptional()
  deliveryLat?: number;

  @IsNumber()
  @IsOptional()
  deliveryLng?: number;

  @IsString()
  @IsOptional()
  guestName?: string;

  @IsString()
  @IsOptional()
  guestPhone?: string;

  @IsString()
  @IsOptional()
  promotionCode?: string;

  @IsString()
  @IsOptional()
  mobileMoneyPhone?: string;
}
