/**
 * Single source of truth for money formatting.
 * The academy bills in Bangladeshi Taka (BDT, symbol ৳).
 */
export const CURRENCY_CODE = 'BDT';
export const CURRENCY_SYMBOL = '৳';

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** "৳1,999" — plain amount, us\'e this for totals and revenue. */
export function formatAmount(value: unknown): string {
  return `${CURRENCY_SYMBOL}${Math.round(toNumber(value)).toLocaleString('en-US')}`;
}

/** "Free" for zero-priced courses, otherwise "৳999". */
export function formatPrice(value: unknown, freeLabel = 'Free'): string {
  const n = toNumber(value);
  return n <= 0 ? freeLabel : formatAmount(n);
}
