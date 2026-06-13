import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

export const ErrorCodes = {
  VENDOR_CLOSED: 'VENDOR_CLOSED',
  OUT_OF_ZONE: 'OUT_OF_ZONE',
  MIN_ORDER_NOT_MET: 'MIN_ORDER_NOT_MET',
  QUOTE_EXPIRED: 'QUOTE_EXPIRED',
  QUOTE_ALREADY_USED: 'QUOTE_ALREADY_USED',
  OVER_LIMIT: 'OVER_LIMIT',
  ITEM_UNAVAILABLE: 'ITEM_UNAVAILABLE',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  PROMO_EXPIRED: 'PROMO_EXPIRED',
  PROMO_USAGE_LIMIT: 'PROMO_USAGE_LIMIT',
  PROMO_CUSTOMER_LIMIT: 'PROMO_CUSTOMER_LIMIT',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  ORDER_NOT_CANCELLABLE: 'ORDER_NOT_CANCELLABLE',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  RIDER_NOT_AVAILABLE: 'RIDER_NOT_AVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

function withCode(message: string, code: ErrorCode): { message: string; code: ErrorCode } {
  return { message, code };
}

export const AppErrors = {
  vendorClosed: () =>
    new BadRequestException(withCode('This vendor is currently closed or not accepting orders', ErrorCodes.VENDOR_CLOSED)),

  outOfZone: () =>
    new BadRequestException(withCode('Delivery address is outside our service zone', ErrorCodes.OUT_OF_ZONE)),

  minOrderNotMet: (minAmount: number) =>
    new UnprocessableEntityException(
      withCode(`Minimum order amount is UGX ${minAmount.toLocaleString()}`, ErrorCodes.MIN_ORDER_NOT_MET),
    ),

  quoteExpired: () =>
    new BadRequestException(withCode('Delivery quote has expired — please request a new one', ErrorCodes.QUOTE_EXPIRED)),

  quoteAlreadyUsed: () =>
    new ConflictException(withCode('Delivery quote has already been used', ErrorCodes.QUOTE_ALREADY_USED)),

  overLimit: (resource: string) =>
    new BadRequestException(withCode(`${resource} limit exceeded`, ErrorCodes.OVER_LIMIT)),

  itemUnavailable: (itemName: string) =>
    new UnprocessableEntityException(
      withCode(`Item "${itemName}" is no longer available`, ErrorCodes.ITEM_UNAVAILABLE),
    ),

  insufficientStock: (itemName: string, available: number) =>
    new UnprocessableEntityException(
      withCode(
        `Only ${available} unit${available === 1 ? '' : 's'} of "${itemName}" available`,
        ErrorCodes.INSUFFICIENT_STOCK,
      ),
    ),

  promoExpired: () =>
    new BadRequestException(withCode('This promotion has expired', ErrorCodes.PROMO_EXPIRED)),

  promoUsageLimit: () =>
    new BadRequestException(withCode('This promotion has reached its usage limit', ErrorCodes.PROMO_USAGE_LIMIT)),

  promoCustomerLimit: () =>
    new BadRequestException(
      withCode('You have already used this promotion the maximum number of times', ErrorCodes.PROMO_CUSTOMER_LIMIT),
    ),

  invalidPaymentMethod: (method: string) =>
    new BadRequestException(
      withCode(`Payment method "${method}" is not available`, ErrorCodes.INVALID_PAYMENT_METHOD),
    ),

  orderNotCancellable: () =>
    new ConflictException(withCode('Order cannot be cancelled at this stage', ErrorCodes.ORDER_NOT_CANCELLABLE)),

  notFound: (resource: string) =>
    new NotFoundException(`${resource} not found`),

  riderNotAvailable: () =>
    new BadRequestException(withCode('No available riders at this time', ErrorCodes.RIDER_NOT_AVAILABLE)),
};
