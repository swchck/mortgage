import type { FxRates } from '@/types';
import { getCached, setCache } from '@/utils/cache';

const CACHE_KEY = 'calc-fx-rates';

export async function fetchFxRates(): Promise<FxRates> {
  const fallback: FxRates = { EUR: 1, USD: 1.08, RUB: 100, RSD: 117 };

  const cached = getCached<FxRates>(CACHE_KEY);
  if (cached) return cached;

  try {
    const r = await fetch('https://open.er-api.com/v6/latest/EUR');
    const d = await r.json();
    if (d.rates) {
      const rates: FxRates = {
        EUR: 1,
        USD: d.rates.USD || fallback.USD,
        RUB: d.rates.RUB || fallback.RUB,
        RSD: d.rates.RSD || fallback.RSD,
      };
      setCache(CACHE_KEY, rates);
      return rates;
    }
  } catch {
    // fallback
  }
  return fallback;
}

export function cvt(amount: number, from: string, to: string, fxRates: FxRates): number {
  if (from === to) return amount;
  return (amount / fxRates[from as keyof FxRates]) * fxRates[to as keyof FxRates];
}
