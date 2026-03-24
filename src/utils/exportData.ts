import type { CalcParams, PayType, ScheduleRow } from '@/types';
import { SYM } from './format';
import { computePSK } from './calc';
import * as XLSX from 'xlsx';

function dlBlob(b: Blob, n: string): void {
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = n;
  a.click();
  URL.revokeObjectURL(u);
}

export function exportCSV(rows: ScheduleRow[], currency: CalcParams['currency']): void {
  if (!rows.length) return;
  const s = SYM[currency];
  const h = ['Мес', 'Дата', `Платёж(${s})`, `Долг(${s})`, `Проц(${s})`, `Досроч(${s})`, 'Тип', `Остаток(${s})`, '%'];
  const lines = [h.join(';')].concat(
    rows.map((r) =>
      [
        r.mo,
        r.date,
        Math.round(r.payment),
        Math.round(r.principal),
        Math.round(r.interest),
        Math.round(r.earlyAmt),
        r.earlyType === 'reduce_term' ? '↓Срок' : r.earlyType === 'reduce_payment' ? '↓Платёж' : '',
        Math.round(r.balance),
        r.annRate.toFixed(2),
      ].join(';'),
    ),
  );
  dlBlob(new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' }), 'mortgage.csv');
}

export function exportExcel(
  rows: ScheduleRow[],
  params: CalcParams,
  payType: PayType,
): void {
  if (!rows.length) return;
  const s = SYM[params.currency];
  const tot = rows.reduce((a, r) => a + r.payment + r.earlyAmt, 0);
  const { psk, ear } = computePSK(params.loan, rows);
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['ИПОТЕЧНЫЙ КАЛЬКУЛЯТОР'],
    [],
    [`Сумма(${s})`, params.loan],
    ['Срок', params.termMo + ' мес.'],
    ['Ставка', params.rateType === 'fixed' ? params.fixedRate + '%' : `${params.indexRate}%+${params.spread}%`],
    ['Тип', payType === 'annuity' ? 'Аннуитет' : 'Дифференц.'],
    ['Валюта', params.currency],
    [],
    [`Итого(${s})`, Math.round(tot)],
    [`Переплата(${s})`, Math.round(tot - params.loan)],
    ['Срок факт.', rows.length + ' мес.'],
    ['ПСК', psk.toFixed(2) + '%'],
    ['EAR', ear.toFixed(2) + '%'],
  ]);
  ws1['!cols'] = [{ wch: 24 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Сводка');
  const d2 = rows.map((r) => ({
    Мес: r.mo,
    Дата: r.date,
    Платёж: Math.round(r.payment),
    Долг: Math.round(r.principal),
    Проц: Math.round(r.interest),
    Досроч: Math.round(r.earlyAmt),
    Тип: r.earlyType || '',
    Остаток: Math.round(r.balance),
    'Ставка%': r.annRate.toFixed(2),
  }));
  const ws2 = XLSX.utils.json_to_sheet(d2);
  ws2['!cols'] = Object.keys(d2[0]).map(() => ({ wch: 12 }));
  XLSX.utils.book_append_sheet(wb, ws2, 'График');
  XLSX.writeFile(wb, 'mortgage.xlsx');
}
