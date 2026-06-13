import { applyMarkup } from '../../common/money';

export interface PriceResolutionInput {
  baseAmount: number;
  saleAmount?: number | null;
  categoryMarkupPercent?: number;
  markupEnabled: boolean;
  quantity?: number;
  minQuantity?: number | null;
  maxQuantity?: number | null;
}

export interface ResolvedPrice {
  vendorPrice: number;
  markedUpPrice: number;
  markupAmount: number;
  salePrice?: number;
}

export function resolvePrice(input: PriceResolutionInput): ResolvedPrice {
  const vendorPrice = input.baseAmount;

  let markedUpPrice = vendorPrice;
  let markupAmount = 0;

  if (input.markupEnabled && input.categoryMarkupPercent) {
    markedUpPrice = applyMarkup(vendorPrice, input.categoryMarkupPercent);
    markupAmount = markedUpPrice - vendorPrice;
  }

  const result: ResolvedPrice = {
    vendorPrice,
    markedUpPrice,
    markupAmount,
  };

  if (input.saleAmount != null && input.saleAmount < markedUpPrice) {
    result.salePrice = input.saleAmount;
  }

  return result;
}

export function effectivePrice(resolved: ResolvedPrice): number {
  return resolved.salePrice ?? resolved.markedUpPrice;
}
