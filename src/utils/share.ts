import type { Currency, RateType, PayType, IndexType, EarlyPayment, EarlyPayAmountType, EarlyPayGoal, IndexChange, AcquisitionCost } from '@/types';

export interface ShareState {
  currency?: Currency;
  propPrice?: number;
  downPayment?: number;
  loan?: number;
  termYears?: number;
  termMonths?: number;
  rateType?: RateType;
  fixedRate?: number;
  indexType?: IndexType;
  indexRate?: number;
  spread?: number;
  payType?: PayType;
  salary?: number;
  monthlyRent?: number;
  eps?: EarlyPayment[];
  ics?: IndexChange[];
  costs?: AcquisitionCost[];
  costsCurrency?: Currency;
}

// Defaults — values that don't need to be in the URL
const DEFAULTS: Record<string, unknown> = {
  currency: 'EUR', rateType: 'fixed', payType: 'annuity',
  indexType: 'euribor6m', indexRate: 2.8, spread: 2.5,
  termMonths: 0,
};

/**
 * Encode state as plain query params with short keys.
 * Only non-default scalar values are included.
 * EPs/ICs/costs use compact pipe-delimited format.
 */
export function encodeShareUrl(state: ShareState): string {
  const url = new URL(window.location.href);
  url.search = '';
  const p = url.searchParams;

  // Scalars — only set if non-default and truthy
  if (state.currency && state.currency !== DEFAULTS.currency) p.set('c', state.currency);
  if (state.propPrice) p.set('pp', String(state.propPrice));
  if (state.downPayment) p.set('dp', String(state.downPayment));
  if (state.loan) p.set('l', String(state.loan));
  if (state.termYears) p.set('ty', String(state.termYears));
  if (state.termMonths && state.termMonths !== DEFAULTS.termMonths) p.set('tm', String(state.termMonths));
  if (state.rateType && state.rateType !== DEFAULTS.rateType) p.set('rt', state.rateType);
  if (state.fixedRate != null) p.set('fr', String(state.fixedRate));
  if (state.rateType === 'index') {
    if (state.indexType && state.indexType !== DEFAULTS.indexType) p.set('it', state.indexType);
    if (state.indexRate != null && state.indexRate !== DEFAULTS.indexRate) p.set('ir', String(state.indexRate));
    if (state.spread != null && state.spread !== DEFAULTS.spread) p.set('sp', String(state.spread));
  }
  if (state.payType && state.payType !== DEFAULTS.payType) p.set('pt', state.payType);
  if (state.costsCurrency) p.set('cc', state.costsCurrency);
  if (state.salary) p.set('sl', String(state.salary));
  if (state.monthlyRent) p.set('rn', String(state.monthlyRent));

  // EPs: fromMonth.toMonth.amountType.amount.type joined by comma
  if (state.eps && state.eps.length > 0) {
    const packed = state.eps.map((e) =>
      `${e.fromMonth}.${e.toMonth}.${e.amountType === 'pct' ? '%' : '$'}.${e.amount}.${e.type === 'reduce_term' ? 't' : 'p'}`,
    );
    p.set('e', packed.join(','));
  }

  // ICs: month.newRate joined by comma
  if (state.ics && state.ics.length > 0) {
    const packed = state.ics.map((ic) => `${ic.month}.${ic.newRate}`);
    p.set('i', packed.join(','));
  }

  // Costs: key.value joined by comma (only non-default values or custom)
  if (state.costs && state.costs.length > 0) {
    const packed = state.costs
      .filter((c) => c.custom || c.value !== c.defaultValue)
      .map((c) => c.custom ? `~${c.type === 'pct' ? '%' : '$'}${c.value}:${c.labelEn}` : `${c.key}=${c.value}`);
    if (packed.length > 0) p.set('x', packed.join(','));
  }

  return url.toString();
}

export function decodeShareUrl(): ShareState | null {
  try {
    const url = new URL(window.location.href);
    const p = url.searchParams;

    // Check for old base64 format
    const oldS = p.get('s');
    if (oldS) {
      try {
        const json = decodeURIComponent(escape(atob(oldS)));
        return JSON.parse(json);
      } catch { /* ignore */ }
    }

    // Need at least loan or propPrice to be a valid share
    if (!p.has('l') && !p.has('pp')) return null;

    const state: ShareState = {};

    state.currency = (p.get('c') as Currency) || (DEFAULTS.currency as Currency);
    if (p.has('pp')) state.propPrice = Number(p.get('pp'));
    if (p.has('dp')) state.downPayment = Number(p.get('dp'));
    if (p.has('l')) state.loan = Number(p.get('l'));
    if (p.has('ty')) state.termYears = Number(p.get('ty'));
    if (p.has('tm')) state.termMonths = Number(p.get('tm'));
    state.rateType = (p.get('rt') as RateType) || (DEFAULTS.rateType as RateType);
    if (p.has('fr')) state.fixedRate = Number(p.get('fr'));
    state.indexType = (p.get('it') as IndexType) || (DEFAULTS.indexType as IndexType);
    if (p.has('ir')) state.indexRate = Number(p.get('ir'));
    if (p.has('sp')) state.spread = Number(p.get('sp'));
    state.payType = (p.get('pt') as PayType) || (DEFAULTS.payType as PayType);
    if (p.has('cc')) state.costsCurrency = p.get('cc') as Currency;
    if (p.has('sl')) state.salary = Number(p.get('sl'));
    if (p.has('rn')) state.monthlyRent = Number(p.get('rn'));

    // EPs
    const eStr = p.get('e');
    if (eStr) {
      let id = 0;
      state.eps = eStr.split(',').map((s) => {
        const [fm, tm, at, amt, tp] = s.split('.');
        return {
          id: ++id,
          fromMonth: fm ? Number(fm) : '' as number | '',
          toMonth: tm ? Number(tm) : '' as number | '',
          amountType: (at === '%' ? 'pct' : 'fixed') as EarlyPayAmountType,
          amount: amt ? Number(amt) : '' as number | '',
          type: (tp === 't' ? 'reduce_term' : 'reduce_payment') as EarlyPayGoal,
        } as unknown as EarlyPayment;
      });
    }

    // ICs
    const iStr = p.get('i');
    if (iStr) {
      let id = 0;
      state.ics = iStr.split(',').map((s) => {
        const [m, r] = s.split('.');
        return { id: ++id, month: m ? Number(m) : '' as number | '', newRate: r ? Number(r) : '' as number | '' } as IndexChange;
      });
    }

    // Costs — decoded in store (needs DEFAULT_COSTS reference)
    const xStr = p.get('x');
    if (xStr) {
      state.costs = xStr.split(',').map((s) => {
        if (s.startsWith('~')) {
          // Custom: ~$400:Name or ~%2.5:Name
          const isPct = s[1] === '%';
          const rest = s.slice(2);
          const [val, name] = rest.split(':');
          return {
            key: 'custom_' + Date.now() + Math.random(),
            labelRu: name || '', labelEn: name || '', labelSr: name || '',
            type: isPct ? 'pct' : 'fixed',
            defaultValue: Number(val), value: Number(val),
            custom: true,
          } as AcquisitionCost;
        }
        // Preset: key=value
        const [key, val] = s.split('=');
        return { key, value: Number(val) } as AcquisitionCost;
      });
    }

    return state;
  } catch {
    return null;
  }
}
