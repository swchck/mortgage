import type { LiveRates } from '@/types';
import { getCached, setCache } from '@/utils/cache';

const CACHE_KEY = 'calc-live-rates';

const ECB: Record<string, string> = {
  euribor3m: 'M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA',
  euribor6m: 'M.U2.EUR.RT.MM.EURIBOR6MD_.HSTA',
  euribor12m: 'M.U2.EUR.RT.MM.EURIBOR1YD_.HSTA',
};

const BASE = 'https://data-api.ecb.europa.eu/service/data/FM/';

export async function fetchLiveRates(): Promise<LiveRates> {
  const cached = getCached<LiveRates>(CACHE_KEY);
  if (cached) return cached;

  const rates: LiveRates = {};

  for (const [k, series] of Object.entries(ECB)) {
    try {
      const url = `${BASE}${series}?lastNObservations=1&format=jsondata`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (!resp.ok) throw new Error(String(resp.status));
      const d = await resp.json();
      const seriesObj = d?.dataSets?.[0]?.series;
      if (!seriesObj) throw new Error('no series');
      const obs = Object.values(seriesObj)[0] as { observations?: Record<string, number[]> };
      if (!obs?.observations) throw new Error('no obs');
      const keys = Object.keys(obs.observations).map(Number).sort((a, b) => a - b);
      const v = parseFloat(String(obs.observations[keys[keys.length - 1]]?.[0]));
      if (!isNaN(v)) (rates as Record<string, number>)[k] = v;
    } catch {
      // skip
    }
  }

  // SOFR
  const sofrUrls = [
    'https://markets.newyorkfed.org/api/rates/sofr/last/1.json',
    'https://api.allorigins.win/raw?url=' +
      encodeURIComponent('https://markets.newyorkfed.org/api/rates/sofr/last/1.json'),
  ];
  for (const url of sofrUrls) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!resp.ok) continue;
      const d = await resp.json();
      const v = d.refRates?.[0]?.percentRate;
      if (v != null) {
        rates.sofr = parseFloat(v);
        break;
      }
    } catch {
      // skip
    }
  }

  if (Object.keys(rates).length > 0) {
    setCache(CACHE_KEY, rates);
  }

  return rates;
}
