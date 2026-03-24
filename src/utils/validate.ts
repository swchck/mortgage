import type { Currency, EarlyPayment } from '@/types';
import { annuityPmt } from './calc';
import { fmt, SYM } from './format';

export interface EPValidation {
  msg: string;
  level: 'warn' | 'error';
}

export function validateEPs(
  epList: EarlyPayment[],
  loan: number,
  termMo: number,
  mRate: number,
  currency: Currency,
): { perEp: Map<number, EPValidation | null>; globalWarn: string | null } {
  const perEp = new Map<number, EPValidation | null>();
  const basePmt = annuityPmt(loan, termMo, mRate);
  const sym = SYM[currency];

  epList.forEach((ep) => {
    const isPct = ep.amountType === 'pct';
    const from = (ep.fromMonth as number) || 1;
    const to = (ep.toMonth as number) || from;
    const months = to - from + 1;
    const amtPerMo = isPct ? basePmt * ((ep.amount as number) / 100) : (ep.amount as number);
    const totalEP = amtPerMo * months;

    if (amtPerMo >= loan) {
      perEp.set(ep.id, {
        msg: `Сумма ${fmt(amtPerMo)} ${sym} ≥ тела кредита. Платёж будет ограничен остатком долга.`,
        level: 'warn',
      });
      return;
    }
    if (months > 1 && totalEP > loan * 0.7) {
      perEp.set(ep.id, {
        msg: `За ${months} мес. будет внесено ${fmt(totalEP)} ${sym} — более 70% кредита. Кредит погасится досрочно, часть платежей не будет использована.`,
        level: 'warn',
      });
      return;
    }
    if (isPct && (ep.amount as number) >= 100) {
      perEp.set(ep.id, {
        msg: `${ep.amount}% от платежа — это больше всего платежа. Проверьте значение.`,
        level: 'error',
      });
      return;
    }
    perEp.set(ep.id, null);
  });

  let globalWarn: string | null = null;
  const totalAllEP = epList.reduce((sum, ep) => {
    const isPct = ep.amountType === 'pct';
    const from = (ep.fromMonth as number) || 1;
    const to = (ep.toMonth as number) || from;
    const months = to - from + 1;
    const amtPerMo = isPct ? basePmt * ((ep.amount as number) / 100) : (ep.amount as number);
    return sum + amtPerMo * months;
  }, 0);

  if (totalAllEP > loan * 1.5) {
    globalWarn = `⚠ Суммарные досрочные платежи (${fmt(totalAllEP)} ${sym}) более чем вдвое превышают тело кредита. Добавление новых нецелесообразно.`;
  }

  return { perEp, globalWarn };
}
