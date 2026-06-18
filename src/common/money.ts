// Money is always integer UGX smallest unit. No float arithmetic.

export const CURRENCY = 'UGX' as const;

export function ugx(amount: number): number {
  if (!Number.isInteger(amount)) {
    throw new Error(`Money must be integer UGX, got: ${amount}`);
  }
  return amount;
}

export function addMoney(a: number, b: number): number {
  return ugx(a + b);
}

export function subtractMoney(a: number, b: number): number {
  return ugx(a - b);
}

export function applyMarkup(baseAmount: number, markupPercent: number): number {
  return ugx(Math.round(baseAmount * (1 + markupPercent / 100)));
}

export function applyPercentage(baseAmount: number, percent: number): number {
  return ugx(Math.round(baseAmount * (percent / 100)));
}

export function applyMultiplier(amount: number, multiplier: number): number {
  return ugx(Math.round(amount * multiplier));
}

export function capAmount(
  amount: number,
  cap: number | null | undefined,
): number {
  if (cap == null) return amount;
  return Math.min(amount, cap);
}
