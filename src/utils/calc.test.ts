import { describe, it, expect } from 'vitest';
import { annuityPmt, buildSchedule, computePSK, simExtra, epForMonth, getMonthlyRate, rentVsBuyBreakeven } from './calc';
import type { CalcParams, EarlyPayment } from '@/types';

function makeParams(overrides: Partial<CalcParams> = {}): CalcParams {
  return {
    loan: 5_000_000,
    termMo: 240,
    startDate: '2025-02-01',
    rateType: 'fixed',
    fixedRate: 9.5,
    indexRate: 0,
    spread: 0,
    eps: [],
    ics: [],
    currency: 'RUB',
    ...overrides,
  };
}

describe('annuityPmt', () => {
  it('calculates correct monthly payment for standard case', () => {
    const pmt = annuityPmt(5_000_000, 240, 9.5 / 1200);
    expect(pmt).toBeCloseTo(46607, -1);
  });

  it('returns full balance for n=0', () => {
    expect(annuityPmt(100_000, 0, 0.01)).toBe(100_000);
  });

  it('handles zero rate', () => {
    const pmt = annuityPmt(120_000, 12, 0);
    expect(pmt).toBeCloseTo(10_000, 0);
  });
});

describe('buildSchedule', () => {
  it('annuity: balance reaches zero', () => {
    const rows = buildSchedule(makeParams(), 'annuity');
    expect(rows.length).toBe(240);
    expect(rows[rows.length - 1].balance).toBeLessThan(1);
  });

  it('annuity: first row has correct payment', () => {
    const rows = buildSchedule(makeParams(), 'annuity');
    expect(rows[0].payment).toBeCloseTo(46607, -1);
  });

  it('diff: payments decrease over time', () => {
    const rows = buildSchedule(makeParams(), 'diff');
    expect(rows[0].payment).toBeGreaterThan(rows[rows.length - 1].payment);
  });

  it('diff: balance reaches zero', () => {
    const rows = buildSchedule(makeParams(), 'diff');
    expect(rows[rows.length - 1].balance).toBeLessThan(1);
  });

  it('early payment reduce_term shortens schedule', () => {
    const ep: EarlyPayment = {
      id: 1,
      fromMonth: 1,
      toMonth: 12,
      amountType: 'fixed',
      amount: 50_000,
      type: 'reduce_term',
    };
    const rows = buildSchedule(makeParams({ eps: [ep] }), 'annuity');
    expect(rows.length).toBeLessThan(240);
  });

  it('early payment reduce_payment changes payment amount', () => {
    const ep: EarlyPayment = {
      id: 1,
      fromMonth: 1,
      toMonth: '',
      amountType: 'fixed',
      amount: 1_000_000,
      type: 'reduce_payment',
    };
    const rows = buildSchedule(makeParams({ eps: [ep] }), 'annuity');
    // After a large early payment with reduce_payment, the next regular payment should be lower
    expect(rows[1].payment).toBeLessThan(rows[0].payment);
  });

  it('index changes: rate switches mid-schedule', () => {
    const p = makeParams({
      rateType: 'index',
      indexRate: 3.5,
      spread: 2.5,
      ics: [{ id: 1, month: 25, newRate: 2.0 }],
    });
    const rows = buildSchedule(p, 'annuity');
    // Rate should change at month 25
    expect(rows[0].annRate).toBeCloseTo(6.0, 1);
    expect(rows[24].annRate).toBeCloseTo(4.5, 1);
  });
});

describe('computePSK', () => {
  it('PSK is greater than nominal rate', () => {
    const rows = buildSchedule(makeParams(), 'annuity');
    const { psk } = computePSK(5_000_000, rows);
    expect(psk).toBeGreaterThan(9.5);
  });

  it('EAR is greater than PSK', () => {
    const rows = buildSchedule(makeParams(), 'annuity');
    const { psk, ear } = computePSK(5_000_000, rows);
    expect(ear).toBeGreaterThan(psk);
  });
});

describe('simExtra', () => {
  it('extra payments reduce months', () => {
    const mRate = 9.5 / 1200;
    const orig = simExtra(5_000_000, 240, mRate, 0);
    const extra = simExtra(5_000_000, 240, mRate, 5000);
    expect(extra.months).toBeLessThan(orig.months);
  });

  it('extra payments reduce interest', () => {
    const mRate = 9.5 / 1200;
    const orig = simExtra(5_000_000, 240, mRate, 0);
    const extra = simExtra(5_000_000, 240, mRate, 5000);
    expect(extra.totalInterest).toBeLessThan(orig.totalInterest);
  });
});

describe('epForMonth', () => {
  it('returns zero when no EPs match', () => {
    const result = epForMonth(5, [], 50000);
    expect(result.extra).toBe(0);
    expect(result.type).toBeNull();
  });

  it('matches one-time EP correctly', () => {
    const ep: EarlyPayment = {
      id: 1,
      fromMonth: 5,
      toMonth: '',
      amountType: 'fixed',
      amount: 100_000,
      type: 'reduce_term',
    };
    expect(epForMonth(5, [ep], 50000).extra).toBe(100_000);
    expect(epForMonth(6, [ep], 50000).extra).toBe(0);
  });

  it('matches range EP correctly', () => {
    const ep: EarlyPayment = {
      id: 1,
      fromMonth: 3,
      toMonth: 6,
      amountType: 'pct',
      amount: 10,
      type: 'reduce_term',
    };
    expect(epForMonth(3, [ep], 50000).extra).toBeCloseTo(5000, 0);
    expect(epForMonth(7, [ep], 50000).extra).toBe(0);
  });
});

describe('getMonthlyRate', () => {
  it('fixed rate returns constant', () => {
    const p = makeParams({ fixedRate: 12 });
    expect(getMonthlyRate(1, p)).toBeCloseTo(0.01, 6);
    expect(getMonthlyRate(100, p)).toBeCloseTo(0.01, 6);
  });

  it('index rate with changes', () => {
    const p = makeParams({
      rateType: 'index',
      indexRate: 3.0,
      spread: 2.0,
      ics: [{ id: 1, month: 10, newRate: 4.0 }],
    });
    expect(getMonthlyRate(5, p)).toBeCloseTo(5.0 / 1200, 8);
    expect(getMonthlyRate(10, p)).toBeCloseTo(6.0 / 1200, 8);
  });
});

describe('rentVsBuyBreakeven', () => {
  it('finds break-even when rent exceeds net buy cost', () => {
    const schedule = buildSchedule(makeParams({ loan: 100_000, termMo: 120, fixedRate: 5 }), 'annuity');
    const result = rentVsBuyBreakeven(schedule, 1500, 5000, 20_000);
    expect(result.breakEvenMonth).not.toBeNull();
    expect(result.breakEvenMonth).toBeGreaterThan(0);
    expect(result.months.length).toBe(schedule.length);
  });

  it('returns null break-even when rent is very low', () => {
    const schedule = buildSchedule(makeParams({ loan: 100_000, termMo: 120, fixedRate: 5 }), 'annuity');
    const result = rentVsBuyBreakeven(schedule, 10, 5000, 20_000);
    expect(result.breakEvenMonth).toBeNull();
  });

  it('returns empty result for zero rent', () => {
    const schedule = buildSchedule(makeParams(), 'annuity');
    const result = rentVsBuyBreakeven(schedule, 0, 0, 0);
    expect(result.months).toHaveLength(0);
    expect(result.breakEvenMonth).toBeNull();
  });

  it('cumulative rent increases linearly', () => {
    const schedule = buildSchedule(makeParams({ loan: 100_000, termMo: 60, fixedRate: 5 }), 'annuity');
    const result = rentVsBuyBreakeven(schedule, 1000, 0, 0);
    expect(result.months[0].rentCum).toBe(1000);
    expect(result.months[11].rentCum).toBe(12000);
  });
});
