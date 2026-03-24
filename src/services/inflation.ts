import { getCached, setCache } from '@/utils/cache';

const CACHE_KEY = 'calc-serbia-inflation';
const FALLBACK = 4.5; // reasonable default for Serbia

export async function fetchSerbiaInflation(): Promise<number> {
  const cached = getCached<number>(CACHE_KEY);
  if (cached !== null) return cached;

  try {
    const r = await fetch(
      'https://api.worldbank.org/v2/country/SRB/indicator/FP.CPI.TOTL.ZG?format=json&per_page=5',
      { signal: AbortSignal.timeout(7000) },
    );
    const d = await r.json();
    // Response: [metadata, [{indicator, country, date, value}, ...]]
    if (Array.isArray(d) && d.length >= 2 && Array.isArray(d[1])) {
      // Find the most recent year with a non-null value
      for (const entry of d[1]) {
        if (entry.value !== null && typeof entry.value === 'number') {
          const rate = Math.round(entry.value * 10) / 10; // round to 1 decimal
          setCache(CACHE_KEY, rate);
          return rate;
        }
      }
    }
  } catch {
    // fallback
  }
  return FALLBACK;
}
