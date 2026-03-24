export type Currency = 'RUB' | 'EUR' | 'USD' | 'RSD';
export type RateType = 'fixed' | 'index';
export type PayType = 'annuity' | 'diff';
export type EarlyPayAmountType = 'fixed' | 'pct';
export type EarlyPayGoal = 'reduce_term' | 'reduce_payment';
export type IndexType = 'euribor3m' | 'euribor6m' | 'euribor12m' | 'sofr' | 'custom';
export type ChartType = 'payments' | 'balance' | 'structure' | 'annual' | 'rate' | 'interestPrincipal' | 'cumulative';

export interface EarlyPayment {
  id: number;
  fromMonth: number | '';
  toMonth: number | '';
  amountType: EarlyPayAmountType;
  amount: number | '';
  type: EarlyPayGoal;
}

export interface IndexChange {
  id: number;
  month: number | '';
  newRate: number | '';
}

export interface CalcParams {
  loan: number;
  termMo: number;
  startDate: string;
  rateType: RateType;
  fixedRate: number;
  indexRate: number;
  spread: number;
  eps: EarlyPayment[];
  ics: IndexChange[];
  currency: Currency;
}

export interface ScheduleRow {
  mo: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  earlyAmt: number;
  earlyType: EarlyPayGoal | null;
  balance: number;
  annRate: number;
}

export interface AcquisitionCost {
  key: string;
  labelRu: string;
  labelEn: string;
  labelSr: string;
  type: 'fixed' | 'pct';
  defaultValue: number;
  value: number;
  custom?: boolean;
}

export interface FxRates {
  EUR: number;
  USD: number;
  RUB: number;
  RSD: number;
}

export interface LiveRates {
  euribor3m?: number;
  euribor6m?: number;
  euribor12m?: number;
  sofr?: number;
}

export interface ScenarioSnapshot {
  label: string;
  currency: Currency;
  loan: number;
  termMo: number;
  rate: number;
  payType: PayType;
  monthlyPayment: number;
  totalPayments: number;
  totalInterest: number;
  overpayment: number;
  actualTermMo: number;
}
