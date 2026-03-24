import type { Currency } from '@/types';

export const SYM: Record<Currency, string> = { RUB: '₽', EUR: '€', USD: '$', RSD: 'дин.' };

const intlFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

export function fmt(n: number): string {
  return intlFmt.format(Math.round(n));
}

export function fmtM(n: number, sym: string): string {
  return fmt(n) + ' ' + sym;
}
