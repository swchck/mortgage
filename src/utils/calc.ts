import type { CalcParams, EarlyPayment, EarlyPayGoal, PayType, ScheduleRow } from '@/types';

export function getMonthlyRate(mo: number, p: CalcParams): number {
  if (p.rateType === 'fixed') return p.fixedRate / 1200;
  let idx = p.indexRate;
  for (const ic of p.ics) if (mo >= (ic.month as number)) idx = ic.newRate as number;
  return (p.spread + idx) / 1200;
}

export function getAnnualRate(mo: number, p: CalcParams): number {
  if (p.rateType === 'fixed') return p.fixedRate;
  let idx = p.indexRate;
  for (const ic of p.ics) if (mo >= (ic.month as number)) idx = ic.newRate as number;
  return p.spread + idx;
}

export function annuityPmt(bal: number, n: number, r: number): number {
  if (n <= 0) return bal;
  if (Math.abs(r) < 1e-10) return bal / n;
  return (bal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function epForMonth(
  mo: number,
  eps: EarlyPayment[],
  basePmt: number,
): { extra: number; type: EarlyPayGoal | null } {
  let extra = 0;
  let type: EarlyPayGoal | null = null;
  for (const ep of eps) {
    const from = (ep.fromMonth as number) || 0;
    const to = (ep.toMonth as number) || (ep.fromMonth as number);
    const inRange = ep.toMonth ? mo >= from && mo <= to : mo === from;
    if (!inRange) continue;
    const amt = ep.amountType === 'pct' ? basePmt * ((ep.amount as number) / 100) : (ep.amount as number);
    extra += amt;
    type = ep.type;
  }
  return { extra, type };
}

export function buildSchedule(p: CalcParams, payType: PayType): ScheduleRow[] {
  let bal = p.loan;
  let rem = p.termMo;
  const sd = p.startDate ? new Date(p.startDate) : new Date();
  let regPmt = annuityPmt(bal, rem, getMonthlyRate(1, p));
  let basePrinc = payType === 'diff' ? p.loan / p.termMo : 0;
  const rows: ScheduleRow[] = [];

  for (let mo = 1; mo <= 1200 && bal > 0.01; mo++) {
    const rate = getMonthlyRate(mo, p);
    const annRate = getAnnualRate(mo, p);
    const prev = mo > 1 ? getMonthlyRate(mo - 1, p) : rate;
    if (payType === 'annuity' && mo > 1 && Math.abs(rate - prev) > 1e-10) {
      regPmt = annuityPmt(bal, rem, rate);
    }
    const interest = bal * rate;
    let princ: number;
    let payment: number;
    if (payType === 'annuity') {
      payment = Math.min(regPmt, bal + interest);
      princ = Math.max(0, payment - interest);
    } else {
      princ = Math.min(basePrinc, bal);
      payment = princ + interest;
    }
    bal = Math.max(0, bal - princ);
    rem = Math.max(0, rem - 1);

    const { extra: earlyAmt, type: earlyType } = epForMonth(mo, p.eps, payment);
    let ea = 0;
    let et: EarlyPayGoal | null = null;
    if (earlyAmt > 0 && bal > 0.01) {
      ea = Math.min(earlyAmt, bal);
      et = earlyType || 'reduce_term';
      bal = Math.max(0, bal - ea);
      if (bal > 0.01 && rem > 0) {
        if (payType === 'annuity' && et === 'reduce_payment') regPmt = annuityPmt(bal, rem, rate);
        if (payType === 'diff' && et === 'reduce_payment') basePrinc = bal / rem;
      }
    }
    const pd = new Date(sd);
    pd.setMonth(pd.getMonth() + (mo - 1));
    rows.push({
      mo,
      date: pd.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      payment,
      principal: princ,
      interest,
      earlyAmt: ea,
      earlyType: et,
      balance: bal,
      annRate,
    });
    if (bal < 0.01) break;
  }
  return rows;
}

export interface Milestone {
  type: '25%' | '50%' | '75%' | '100%' | 'principal_gt_interest';
  month: number;
  date: string;
  balance: number;
  totalPaidPrincipal: number;
}

export function findMilestones(schedule: ScheduleRow[], loan: number): Milestone[] {
  if (!schedule.length || loan <= 0) return [];
  const milestones: Milestone[] = [];
  let cumPrincipal = 0;
  const thresholds: Array<{ pct: number; type: '25%' | '50%' | '75%' | '100%' }> = [
    { pct: 0.25, type: '25%' },
    { pct: 0.50, type: '50%' },
    { pct: 0.75, type: '75%' },
    { pct: 1.00, type: '100%' },
  ];
  let nextThreshold = 0;
  let foundPGI = false;

  for (const row of schedule) {
    cumPrincipal += row.principal + row.earlyAmt;

    if (!foundPGI && row.principal > row.interest) {
      foundPGI = true;
      milestones.push({
        type: 'principal_gt_interest',
        month: row.mo,
        date: row.date,
        balance: row.balance,
        totalPaidPrincipal: cumPrincipal,
      });
    }

    while (
      nextThreshold < thresholds.length &&
      cumPrincipal >= loan * thresholds[nextThreshold].pct - 0.01
    ) {
      milestones.push({
        type: thresholds[nextThreshold].type,
        month: row.mo,
        date: row.date,
        balance: row.balance,
        totalPaidPrincipal: cumPrincipal,
      });
      nextThreshold++;
    }
  }

  const typeOrder: Record<string, number> = {
    principal_gt_interest: 0,
    '25%': 1,
    '50%': 2,
    '75%': 3,
    '100%': 4,
  };
  milestones.sort((a, b) => a.month - b.month || typeOrder[a.type] - typeOrder[b.type]);
  return milestones;
}

export function computePSK(loan: number, rows: ScheduleRow[]): { psk: number; ear: number } {
  const cf = [-loan, ...rows.map((r) => r.payment + r.earlyAmt)];
  let r = 0.008;
  for (let i = 0; i < 300; i++) {
    let f = 0;
    let df = 0;
    for (let t = 0; t < cf.length; t++) {
      const d = Math.pow(1 + r, t);
      f += cf[t] / d;
      df -= (t * cf[t]) / (d * (1 + r));
    }
    const dr = f / df;
    r -= dr;
    if (Math.abs(dr) < 1e-12) break;
  }
  return { psk: r * 12 * 100, ear: (Math.pow(1 + r, 12) - 1) * 100 };
}

export function maxLoanFromPayment(maxPmt: number, termMo: number, monthlyRate: number): number {
  if (monthlyRate < 1e-10) return maxPmt * termMo;
  return maxPmt * (Math.pow(1 + monthlyRate, termMo) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, termMo));
}

export interface RentVsBuyMonth {
  mo: number;
  rentCum: number;
  buyCum: number;
  equity: number;
}

export interface RentVsBuyResult {
  breakEvenMonth: number | null;
  months: RentVsBuyMonth[];
}

export function rentVsBuyBreakeven(
  schedule: ScheduleRow[],
  monthlyRent: number,
  acquisitionCosts: number,
  downPayment: number,
): RentVsBuyResult {
  if (!schedule.length || monthlyRent <= 0) {
    return { breakEvenMonth: null, months: [] };
  }
  const loan = schedule[0].balance + schedule[0].principal + schedule[0].earlyAmt;
  const months: RentVsBuyMonth[] = [];
  let breakEvenMonth: number | null = null;
  let cumBuyCost = downPayment + acquisitionCosts;

  for (const row of schedule) {
    cumBuyCost += row.payment + row.earlyAmt;
    const rentCum = monthlyRent * row.mo;
    const equity = loan - row.balance;
    const netBuyCost = cumBuyCost - equity;

    months.push({ mo: row.mo, rentCum, buyCum: netBuyCost, equity });

    if (breakEvenMonth === null && rentCum > netBuyCost) {
      breakEvenMonth = row.mo;
    }
  }

  return { breakEvenMonth, months };
}

export function simExtra(
  loan: number,
  termMo: number,
  monthlyRate: number,
  extraPerMo: number,
): { months: number; totalInterest: number } {
  let bal = loan;
  let totInt = 0;
  let mo = 0;
  const base = annuityPmt(loan, termMo, monthlyRate);
  while (bal > 0.01 && mo < termMo + 500) {
    const intr = bal * monthlyRate;
    totInt += intr;
    let princ = base + extraPerMo - intr;
    if (princ < 0) princ = 0;
    if (princ > bal) princ = bal;
    bal = Math.max(0, bal - princ);
    mo++;
  }
  return { months: mo, totalInterest: totInt };
}
