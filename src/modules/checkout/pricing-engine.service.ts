import { Injectable } from '@nestjs/common';
import {
  addMoney,
  applyMarkup,
  applyPercentage,
  capAmount,
} from '../../common/money';
import type { PlatformSettings } from '../../db/schema/platform-settings';

export interface CartLineItem {
  unitPrice: number;
  vendorUnitPrice: number;
  markupAmount: number;
  quantity: number;
  subtotal: number;
  taxTotal: number;
}

export interface PriceBreakdown {
  subtotal: number;
  markupTotal: number;
  serviceFee: number;
  smallOrderFee: number;
  deliveryFee: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  lines: CartLineItem[];
}

export interface PriceInput {
  lines: Array<{
    variantId: string;
    quantity: number;
    unitPrice: number; // marked-up
    vendorUnitPrice: number;
    markupAmount: number;
  }>;
  deliveryFee?: number;
  discountAmount?: number;
  settings: PlatformSettings;
  minimumOrderAmount?: number | null;
}

@Injectable()
export class PricingEngine {
  compute(input: PriceInput): PriceBreakdown {
    const { settings } = input;

    const lines: CartLineItem[] = input.lines.map((l) => ({
      unitPrice: l.unitPrice,
      vendorUnitPrice: l.vendorUnitPrice,
      markupAmount: l.markupAmount,
      quantity: l.quantity,
      subtotal: l.unitPrice * l.quantity,
      taxTotal: 0,
    }));

    const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
    const markupTotal = lines.reduce((s, l) => s + l.markupAmount * l.quantity, 0);
    const taxTotal = lines.reduce((s, l) => s + l.taxTotal, 0);

    let serviceFee = 0;
    if (settings.serviceFeeEnabled) {
      if (settings.serviceFeeType === 'percentage') {
        serviceFee = applyPercentage(subtotal, settings.serviceFeeAmount);
        if (settings.serviceFeeCap) {
          serviceFee = capAmount(serviceFee, settings.serviceFeeCap);
        }
      } else {
        serviceFee = settings.serviceFeeAmount;
      }
    }

    let smallOrderFee = 0;
    if (
      settings.smallOrderFeeEnabled &&
      subtotal < settings.smallOrderFeeThreshold
    ) {
      smallOrderFee = settings.smallOrderFeeAmount;
    }

    const deliveryFee = input.deliveryFee ?? 0;
    const discountTotal = input.discountAmount ?? 0;

    const total = Math.max(
      0,
      subtotal + serviceFee + smallOrderFee + deliveryFee + taxTotal - discountTotal,
    );

    return {
      subtotal,
      markupTotal,
      serviceFee,
      smallOrderFee,
      deliveryFee,
      discountTotal,
      taxTotal,
      total,
      lines,
    };
  }
}
