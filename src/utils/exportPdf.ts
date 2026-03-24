import type { CalcParams, ScheduleRow, PayType, Currency } from '@/types';
import { computePSK } from './calc';
import { SYM } from './format';

function fmtNum(n: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n));
}

export function exportPrintView(
  params: CalcParams,
  schedule: ScheduleRow[],
  payType: PayType,
  currency: Currency,
): void {
  if (!schedule.length) return;

  const sym = SYM[currency];
  const totalPaid = schedule.reduce((a, r) => a + r.payment + r.earlyAmt, 0);
  const totalInterest = schedule.reduce((a, r) => a + r.interest, 0);
  const overpayment = totalPaid - params.loan;
  const { psk, ear } = computePSK(params.loan, schedule);
  const firstPmt = schedule[0].payment;
  const lastPmt = schedule[schedule.length - 1].payment;
  const actualTermMo = schedule.length;
  const actualYears = Math.floor(actualTermMo / 12);
  const actualMo = actualTermMo % 12;

  const rateStr =
    params.rateType === 'fixed'
      ? `${params.fixedRate}%`
      : `${params.indexRate}% + ${params.spread}% = ${(params.indexRate + params.spread).toFixed(2)}%`;

  const payTypeStr = payType === 'annuity' ? 'Annuity' : 'Differentiated';
  const termStr = `${Math.floor(params.termMo / 12)}y ${params.termMo % 12}m`;
  const actualTermStr =
    actualMo > 0 ? `${actualYears}y ${actualMo}m (${actualTermMo} mo.)` : `${actualYears}y (${actualTermMo} mo.)`;

  // Sample rows if schedule is too long (>120)
  let displayRows = schedule;
  let sampled = false;
  if (schedule.length > 120) {
    sampled = true;
    const step = Math.ceil(schedule.length / 60);
    displayRows = schedule.filter((_, i) => i === 0 || i === schedule.length - 1 || i % step === 0);
  }

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const scheduleRows = displayRows
    .map(
      (r) => `
      <tr>
        <td>${r.mo}</td>
        <td>${r.date}</td>
        <td>${fmtNum(r.payment)}</td>
        <td>${fmtNum(r.principal)}</td>
        <td>${fmtNum(r.interest)}</td>
        <td>${r.earlyAmt > 0 ? fmtNum(r.earlyAmt) : '—'}</td>
        <td>${fmtNum(r.balance)}</td>
        <td>${r.annRate.toFixed(2)}%</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Mortgage Calculator — Print</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; padding: 24px; }
  h1 { font-size: 18px; margin-bottom: 2px; }
  .date { color: #666; font-size: 10px; margin-bottom: 16px; }
  h2 { font-size: 13px; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #ccc; padding: 3px 6px; text-align: right; font-size: 10px; }
  th { background: #f0f0f0; font-weight: 600; text-align: center; }
  td:first-child, th:first-child { text-align: center; }
  .params-table { width: auto; }
  .params-table td { text-align: left; }
  .params-table td:first-child { font-weight: 600; padding-right: 16px; white-space: nowrap; }
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 20px; margin-bottom: 12px; }
  .stat-item { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 2px 0; }
  .stat-label { color: #555; }
  .stat-value { font-weight: 600; }
  .note { color: #888; font-size: 9px; font-style: italic; margin-bottom: 6px; }
  @media print {
    body { padding: 12px; }
    @page { margin: 12mm; size: A4; }
  }
</style>
</head>
<body>
<h1>Mortgage Calculator</h1>
<div class="date">${today}</div>

<h2>Parameters</h2>
<table class="params-table">
  <tr><td>Loan Amount</td><td>${fmtNum(params.loan)} ${sym}</td></tr>
  <tr><td>Term</td><td>${termStr} (${params.termMo} mo.)</td></tr>
  <tr><td>Rate</td><td>${rateStr}</td></tr>
  <tr><td>Payment Type</td><td>${payTypeStr}</td></tr>
  <tr><td>Currency</td><td>${currency}</td></tr>
  <tr><td>Start Date</td><td>${params.startDate || '—'}</td></tr>
</table>

<h2>Key Statistics</h2>
<div class="stats-grid">
  <div class="stat-item"><span class="stat-label">First Payment</span><span class="stat-value">${fmtNum(firstPmt)} ${sym}</span></div>
  <div class="stat-item"><span class="stat-label">Last Payment</span><span class="stat-value">${fmtNum(lastPmt)} ${sym}</span></div>
  <div class="stat-item"><span class="stat-label">Total Payments</span><span class="stat-value">${fmtNum(totalPaid)} ${sym}</span></div>
  <div class="stat-item"><span class="stat-label">Total Interest</span><span class="stat-value">${fmtNum(totalInterest)} ${sym}</span></div>
  <div class="stat-item"><span class="stat-label">Overpayment</span><span class="stat-value">${fmtNum(overpayment)} ${sym}</span></div>
  <div class="stat-item"><span class="stat-label">Actual Term</span><span class="stat-value">${actualTermStr}</span></div>
  <div class="stat-item"><span class="stat-label">APR (nominal)</span><span class="stat-value">${psk.toFixed(2)}%</span></div>
  <div class="stat-item"><span class="stat-label">EAR (effective)</span><span class="stat-value">${ear.toFixed(2)}%</span></div>
</div>

<h2>Payment Schedule${sampled ? ' (sampled)' : ''}</h2>
${sampled ? '<p class="note">Showing every ' + Math.ceil(schedule.length / 60) + 'th row (' + displayRows.length + ' of ' + schedule.length + ' total)</p>' : ''}
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Date</th>
      <th>Payment (${sym})</th>
      <th>Principal (${sym})</th>
      <th>Interest (${sym})</th>
      <th>Early (${sym})</th>
      <th>Balance (${sym})</th>
      <th>Rate</th>
    </tr>
  </thead>
  <tbody>
    ${scheduleRows}
  </tbody>
</table>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
