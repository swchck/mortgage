<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import type { ScheduleRow } from '@/types';
import { useI18n } from 'vue-i18n';
import { fmtM, SYM } from '@/utils/format';
import { buildSchedule, annuityPmt, simExtra, maxLoanFromPayment } from '@/utils/calc';
import ResultsPanel from './ResultsPanel.vue';
import AppModal from '@/components/ui/AppModal.vue';
import { ChevronDown, ExternalLink } from 'lucide-vue-next';

const store = useCalcStore();
const { t } = useI18n();

const collapsed = ref(true);
const modalOpen = ref(false);
const modalTitle = ref('');
const modalBody = ref('');

function toggle() {
  collapsed.value = !collapsed.value;
}

interface InsightCard {
  cls?: string;
  icon: string;
  label: string;
  value: string;
  desc: string;
  detail: string;
}

// Styling helpers for modal HTML
const tbl = (rows: string[][]) => {
  const hdr = rows[0].map(c => `<th style="padding:6px 10px;text-align:left;border-bottom:2px solid var(--border);font-size:11px;color:var(--muted);font-weight:500">${c}</th>`).join('');
  const body = rows.slice(1).map(r => '<tr>' + r.map(c => `<td style="padding:5px 10px;border-bottom:1px solid var(--border);font-size:12px">${c}</td>`).join('') + '</tr>').join('');
  return `<table style="width:100%;border-collapse:collapse;margin:10px 0"><thead><tr>${hdr}</tr></thead><tbody>${body}</tbody></table>`;
};
const sec = (title: string) => `<div style="font-size:13px;font-weight:600;color:var(--text);margin:16px 0 6px">${title}</div>`;
const val = (v: string) => `<span style="font-family:'IBM Plex Mono',monospace;font-weight:600;color:var(--green)">${v}</span>`;
const warn = (v: string) => `<span style="color:var(--gold)">${v}</span>`;
const hi = (v: string) => `<strong style="color:var(--text)">${v}</strong>`;
const note = (v: string) => `<div style="margin-top:10px;padding:10px;border-radius:8px;background:var(--surface2);font-size:11px;color:var(--muted);line-height:1.6">${v}</div>`;
const bar = (label: string, pct: number, color: string) =>
  `<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="width:100px;font-size:11px;color:var(--muted)">${label}</span><div style="flex:1;height:14px;border-radius:4px;background:var(--surface2);overflow:hidden"><div style="height:100%;width:${Math.min(pct, 100)}%;background:${color};border-radius:4px"></div></div><span style="font-size:11px;font-family:'IBM Plex Mono',monospace;width:48px;text-align:right">${pct.toFixed(1)}%</span></div>`;

function openInsight(card: InsightCard) {
  modalTitle.value = card.label;
  modalBody.value = card.detail;
  modalOpen.value = true;
}

const cards = computed<InsightCard[]>(() => {
  const rows = store.activeSchedule;
  if (!rows.length) return [];
  const p = store.readParams();
  const sym = SYM[store.currency];
  const loan = p.loan;
  const termMo = p.termMo;
  const annRate = p.rateType === 'fixed' ? p.fixedRate : p.indexRate + p.spread;
  const mRate = annRate / 1200;
  const totInt = rows.reduce((a: number, r: ScheduleRow) => a + r.interest, 0);
  const totPmt = rows.reduce((a: number, r: ScheduleRow) => a + r.payment + r.earlyAmt, 0);
  const hasEP = p.eps.length > 0;
  const totalEarly = rows.reduce((a: number, r: ScheduleRow) => a + r.earlyAmt, 0);

  const totAnn = store.scheduleAnn.reduce((a: number, r: ScheduleRow) => a + r.payment + r.earlyAmt, 0);
  const totDif = store.scheduleDif.reduce((a: number, r: ScheduleRow) => a + r.payment + r.earlyAmt, 0);
  const diffSaving = totAnn - totDif;
  const intAnn = store.scheduleAnn.reduce((a: number, r: ScheduleRow) => a + r.interest, 0);
  const intDif = store.scheduleDif.reduce((a: number, r: ScheduleRow) => a + r.interest, 0);

  const baseRows = buildSchedule({ ...p, eps: [] }, 'annuity');
  const baseInt = baseRows.reduce((a: number, r: ScheduleRow) => a + r.interest, 0);
  const basePmt = annuityPmt(loan, termMo, mRate);
  const baseTotPmt = basePmt * termMo;

  const optWin = Math.round(termMo * 0.3);

  const extra10 = basePmt * 0.1;
  const origSim = simExtra(loan, termMo, mRate, 0);
  const sim10 = simExtra(loan, termMo, mRate, extra10);
  const sim20 = simExtra(loan, termMo, mRate, basePmt * 0.2);
  const sim50 = simExtra(loan, termMo, mRate, basePmt * 0.5);
  const moSaved = Math.max(0, origSim.months - sim10.months);
  const intSaved = Math.max(0, origSim.totalInterest - sim10.totalInterest);

  const currentIntSaving = Math.max(0, baseInt - totInt);
  const currentMoSaving = Math.max(0, baseRows.length - rows.length);

  const refiRate = annRate - 2;
  let refiSaving = 0;
  let refiNewPmt = 0;
  let refiOldPmt = 0;
  let refiRemBal = 0;
  let refiRemMo = 0;
  if (refiRate > 0.5 && rows.length > 0) {
    const switchMo = Math.round(rows.length * 0.4);
    const remRow = rows[Math.min(switchMo, rows.length - 1)];
    refiRemBal = remRow?.balance || 0;
    refiRemMo = rows.length - switchMo;
    if (refiRemMo > 0 && refiRemBal > 0) {
      refiOldPmt = annuityPmt(refiRemBal, refiRemMo, mRate);
      refiNewPmt = annuityPmt(refiRemBal, refiRemMo, refiRate / 1200);
      refiSaving = Math.max(0, (refiOldPmt - refiNewPmt) * refiRemMo);
    }
  }

  // Interest to principal ratio per year for first few years
  const yearData: { year: number; intPct: number; princPct: number }[] = [];
  for (let y = 0; y < Math.min(Math.ceil(rows.length / 12), 5); y++) {
    const slice = rows.slice(y * 12, (y + 1) * 12);
    const yInt = slice.reduce((a: number, r: ScheduleRow) => a + r.interest, 0);
    const yPrinc = slice.reduce((a: number, r: ScheduleRow) => a + r.principal, 0);
    const total = yInt + yPrinc;
    if (total > 0) yearData.push({ year: y + 1, intPct: yInt / total * 100, princPct: yPrinc / total * 100 });
  }

  // Monthly payment as % of property value
  const propPrice = Number(store.propPrice) || 0;
  const firstPmt = rows[0]?.payment || 0;
  const maxPmt = Math.max(...rows.map((r: ScheduleRow) => r.payment));
  const minPmt = Math.min(...rows.map((r: ScheduleRow) => r.payment));

  const intRatio = totInt / loan * 100;

  const result: InsightCard[] = [];

  // ── 1. Early payment effect ──
  if (hasEP && currentIntSaving > 100) {
    const effRoi = totalEarly > 0 ? (currentIntSaving / totalEarly * 100).toFixed(1) : '0';
    result.push({
      icon: '✅', label: t('insights.epEffect'),
      value: `−${fmtM(currentIntSaving, sym)} · −${currentMoSaving} ${t('months')}`,
      desc: `${fmtM(totalEarly, sym)} → −${fmtM(currentIntSaving, sym)}, −${currentMoSaving} ${t('months')}`,
      detail:
        `<div style="font-size:15px;font-weight:600;color:var(--green);margin-bottom:14px">−${fmtM(currentIntSaving, sym)} · −${currentMoSaving} ${t('months')}</div>` +
        sec(t('insights.base') + ' vs ' + t('insights.current')) +
        tbl([
          ['', t('months'), t('stats.interest'), t('stats.totalPayments')],
          [t('insights.base'), String(baseRows.length), fmtM(baseInt, sym), fmtM(baseTotPmt, sym)],
          [t('insights.current'), String(rows.length), fmtM(totInt, sym), fmtM(totPmt, sym)],
          [t('insights.saved'), val(String(currentMoSaving)), val(fmtM(currentIntSaving, sym)), val(fmtM(baseTotPmt - totPmt, sym))],
        ]) +
        sec('ROI') +
        `<p style="font-size:12px">${t('insights.saved')}: ${val(fmtM(currentIntSaving, sym))} / ${fmtM(totalEarly, sym)} = ${val(effRoi + '%')}</p>` +
        note(`1 ${sym} → ${(currentIntSaving / Math.max(totalEarly, 1)).toFixed(2)} ${sym}`),
    });
  }

  // ── 2. Annuity vs Differentiated ──
  if (diffSaving > loan * 0.005) {
    const annFirstPmt = store.scheduleAnn[0]?.payment || 0;
    const difFirstPmt = store.scheduleDif[0]?.payment || 0;
    const difLastPmt = store.scheduleDif[store.scheduleDif.length - 1]?.payment || 0;
    result.push({
      icon: '💡', label: t('insights.diffBetter'),
      value: `−${fmtM(diffSaving, sym)}`,
      desc: `${t('payTypes.diff')}: ${fmtM(intDif, sym)} vs ${t('payTypes.annuity')}: ${fmtM(intAnn, sym)}`,
      detail:
        `<div style="font-size:15px;font-weight:600;color:var(--green);margin-bottom:14px">${t('insights.saved')}: ${fmtM(diffSaving, sym)}</div>` +
        tbl([
          ['', t('payTypes.annuity'), t('payTypes.diff'), 'Δ'],
          [t('stats.totalPayments'), fmtM(totAnn, sym), fmtM(totDif, sym), val('−' + fmtM(diffSaving, sym))],
          [t('stats.interest'), fmtM(intAnn, sym), fmtM(intDif, sym), val('−' + fmtM(intAnn - intDif, sym))],
          [t('months'), String(store.scheduleAnn.length), String(store.scheduleDif.length), ''],
          ['1-й ' + t('months'), fmtM(annFirstPmt, sym), fmtM(difFirstPmt, sym), warn('+' + fmtM(difFirstPmt - annFirstPmt, sym))],
        ]) +
        note(`${t('payTypes.diff')}: 1-й = ${fmtM(difFirstPmt, sym)}, → ${fmtM(difLastPmt, sym)}<br>${t('payTypes.annuity')}: ${fmtM(annFirstPmt, sym)} (const)`),
    });
  }

  // ── 3. +10% extra payment simulation ──
  if (moSaved > 0 && intSaved > 0 && !hasEP) {
    const mo20 = Math.max(0, origSim.months - sim20.months);
    const int20 = Math.max(0, origSim.totalInterest - sim20.totalInterest);
    const mo50 = Math.max(0, origSim.months - sim50.months);
    const int50 = Math.max(0, origSim.totalInterest - sim50.totalInterest);
    result.push({
      icon: '🚀', label: t('insights.extraTenPercent'),
      value: `−${moSaved} ${t('months')} · −${fmtM(intSaved, sym)}`,
      desc: `+${fmtM(extra10, sym)}/${t('months')} → −${fmtM(intSaved, sym)}, −${moSaved} ${t('months')}`,
      detail:
        `<div style="font-size:15px;font-weight:600;color:var(--green);margin-bottom:14px">−${moSaved} ${t('months')} · −${fmtM(intSaved, sym)}</div>` +
        sec(t('insights.scenario')) +
        tbl([
          ['+%', '+' + sym + '/' + t('months'), '−' + t('months'), '−' + t('stats.interest')],
          ['+10%', fmtM(extra10, sym), String(moSaved), fmtM(intSaved, sym)],
          ['+20%', fmtM(basePmt * 0.2, sym), String(mo20), fmtM(int20, sym)],
          ['+50%', fmtM(basePmt * 0.5, sym), String(mo50), fmtM(int50, sym)],
        ]) +
        note(`${t('insights.base')}: ${fmtM(basePmt, sym)}/${t('months')} × ${origSim.months} ${t('months')} = ${fmtM(origSim.totalInterest, sym)} %`),
    });
  } else if (moSaved > 0 && intSaved > 0 && hasEP) {
    result.push({
      icon: '🚀', label: t('insights.extraTenPercentMore'),
      value: `−${moSaved} ${t('months')}`,
      desc: `+${fmtM(extra10, sym)}/${t('months')} → −${moSaved} ${t('months')}, −${fmtM(intSaved, sym)}`,
      detail:
        `<div style="font-size:15px;font-weight:600;color:var(--green);margin-bottom:14px">−${moSaved} ${t('months')} · −${fmtM(intSaved, sym)}</div>` +
        `<p style="font-size:12px">+10% = ${fmtM(extra10, sym)}/${t('months')}</p>` +
        `<p style="font-size:12px">${t('insights.saved')}: −${moSaved} ${t('months')}, −${fmtM(intSaved, sym)}</p>`,
    });
  }

  // ── 4. Best time for early payment ──
  if (!hasEP) {
    result.push({
      icon: '🎯', label: t('insights.bestTime'),
      value: `${optWin} ${t('months')} (${Math.round(optWin / 12)} ${t('years')})`,
      desc: t('insights.bestTimeDesc', { n: optWin }),
      detail:
        `<div style="font-size:15px;font-weight:600;color:var(--green);margin-bottom:14px">${optWin} ${t('months')} (${Math.round(optWin / 12)} ${t('years')})</div>` +
        sec(t('stats.interest') + ' / ' + t('stats.principal') + ' — %') +
        yearData.map(y =>
          bar(`${t('years')} ${y.year}`, y.intPct, 'var(--gold)'),
        ).join('') +
        note(t('insights.bestTimeDesc', { n: optWin })),
    });
  }

  // ── 5. Strategy ──
  if (!hasEP) {
    result.push({
      icon: '⚖️', label: t('insights.strategy'),
      value: t('insights.strategyValue'),
      desc: t('insights.strategyDesc'),
      detail:
        sec('↓ ' + t('termYears')) +
        `<p style="font-size:12px;line-height:1.6">${t('insights.strategyDesc')}</p>` +
        sec(t('insights.recommendation')) +
        `<p style="font-size:12px;line-height:1.6">${t('insights.recommendation')}</p>`,
    });
  }

  // ── 6. Refinancing ──
  if (refiSaving > loan * 0.01) {
    const refiCost1pct = refiRemBal * 0.01;
    const refiCost2pct = refiRemBal * 0.02;
    const netSaving1 = refiSaving - refiCost1pct;
    const netSaving2 = refiSaving - refiCost2pct;
    result.push({
      icon: '🔄', label: t('insights.refi'),
      value: `~${fmtM(refiSaving, sym)}`,
      desc: `@40%, ${refiRate.toFixed(1)}% → ~${fmtM(refiSaving, sym)}`,
      detail:
        `<div style="font-size:15px;font-weight:600;color:var(--green);margin-bottom:14px">~${fmtM(refiSaving, sym)}</div>` +
        sec(t('insights.scenario')) +
        tbl([
          ['', t('insights.current'), t('insights.refi')],
          ['%', annRate.toFixed(2) + '%', val(refiRate.toFixed(2) + '%')],
          [t('months'), fmtM(refiOldPmt, sym), val(fmtM(refiNewPmt, sym))],
          ['Δ/' + t('months'), '', val('−' + fmtM(refiOldPmt - refiNewPmt, sym))],
        ]) +
        sec(t('insights.saved') + ' (−%)') +
        tbl([
          ['', t('insights.saved')],
          ['−1% (' + fmtM(refiCost1pct, sym) + ')', netSaving1 > 0 ? val(fmtM(netSaving1, sym)) : warn(fmtM(netSaving1, sym))],
          ['−2% (' + fmtM(refiCost2pct, sym) + ')', netSaving2 > 0 ? val(fmtM(netSaving2, sym)) : warn(fmtM(netSaving2, sym))],
        ]) +
        note(`${t('insights.base')}: ${fmtM(refiRemBal, sym)}, ${refiRemMo} ${t('months')}`),
    });
  }

  // ── 7. Tax deduction (RUB only) ──
  if (store.currency === 'RUB') {
    const maxBody = Math.min(loan, 2_000_000) * 0.13;
    const maxIntr = Math.min(totInt, 3_000_000) * 0.13;
    const total = maxBody + maxIntr;
    result.push({
      icon: '🏛️', label: t('insights.taxDeduction'),
      value: `→ ${fmtM(total, '₽')}`,
      desc: `${fmtM(maxBody, '₽')} + ${fmtM(maxIntr, '₽')}`,
      detail:
        `<div style="font-size:15px;font-weight:600;color:var(--green);margin-bottom:14px">${fmtM(total, '₽')}</div>` +
        tbl([
          ['', 'max', '13%', '='],
          [t('stats.principal'), fmtM(Math.min(loan, 2_000_000), '₽'), '13%', val(fmtM(maxBody, '₽'))],
          [t('stats.interest'), fmtM(Math.min(totInt, 3_000_000), '₽'), '13%', val(fmtM(maxIntr, '₽'))],
          ['Σ', '', '', hi(fmtM(total, '₽'))],
        ]) +
        note('ст. 220 НК РФ'),
    });
  }

  // ── 8. Overpayment ratio ──
  {
    const benchmarks = [
      { rate: 3, years: 20, ratio: 33.2 },
      { rate: 5, years: 20, ratio: 58.4 },
      { rate: 7, years: 20, ratio: 86.1 },
      { rate: 10, years: 20, ratio: 115.8 },
      { rate: 12, years: 20, ratio: 165.2 },
      { rate: 15, years: 20, ratio: 190.5 },
    ];
    result.push({
      icon: '📊', label: t('insights.overpayRatio'),
      value: `${intRatio.toFixed(1)}%`,
      desc: `${fmtM(totInt, sym)} / ${fmtM(loan, sym)}`,
      detail:
        `<div style="font-size:15px;font-weight:600;color:${intRatio < 60 ? 'var(--green)' : intRatio < 120 ? 'var(--gold)' : 'var(--red)'};margin-bottom:14px">${intRatio.toFixed(1)}%</div>` +
        bar(t('stats.principal'), loan / totPmt * 100, 'var(--blue)') +
        bar(t('stats.interest'), totInt / totPmt * 100, 'var(--gold)') +
        (totalEarly > 0 ? bar(t('charts.labels.early'), totalEarly / totPmt * 100, 'var(--green)') : '') +
        sec(t('insights.benchmarks')) +
        tbl([
          ['%', '20 ' + t('years'), ''],
          ...benchmarks.map(b => [
            b.rate + '%',
            b.ratio.toFixed(1) + '%',
            b.rate === Math.round(annRate) ? val('← ' + t('insights.current')) : '',
          ]),
        ]),
    });
  }

  // ── 9. Payment breakdown (first year vs last year) ──
  if (rows.length >= 24) {
    const first12 = rows.slice(0, 12);
    const last12 = rows.slice(-12);
    const f12int = first12.reduce((a: number, r: ScheduleRow) => a + r.interest, 0);
    const f12princ = first12.reduce((a: number, r: ScheduleRow) => a + r.principal, 0);
    const l12int = last12.reduce((a: number, r: ScheduleRow) => a + r.interest, 0);
    const l12princ = last12.reduce((a: number, r: ScheduleRow) => a + r.principal, 0);
    const f12intPct = f12int / (f12int + f12princ) * 100;
    const l12intPct = l12int / (l12int + l12princ) * 100;

    result.push({
      icon: '📈', label: t('insights.paymentBreakdown') || 'Payment breakdown',
      value: `${f12intPct.toFixed(0)}% → ${l12intPct.toFixed(0)}%`,
      desc: `${t('stats.interest')}: ${f12intPct.toFixed(1)}% → ${l12intPct.toFixed(1)}%`,
      detail:
        `<div style="font-size:15px;font-weight:600;color:var(--blue);margin-bottom:14px">${f12intPct.toFixed(0)}% → ${l12intPct.toFixed(0)}% ${t('stats.interest')}</div>` +
        sec('1-й ' + t('years')) +
        bar(t('stats.interest'), f12intPct, 'var(--gold)') +
        bar(t('stats.principal'), 100 - f12intPct, 'var(--blue)') +
        `<p style="font-size:11px;color:var(--muted);margin-top:4px">${fmtM(f12int, sym)} / ${fmtM(f12princ, sym)}</p>` +
        sec(t('years') + ' ' + Math.ceil(rows.length / 12)) +
        bar(t('stats.interest'), l12intPct, 'var(--gold)') +
        bar(t('stats.principal'), 100 - l12intPct, 'var(--blue)') +
        `<p style="font-size:11px;color:var(--muted);margin-top:4px">${fmtM(l12int, sym)} / ${fmtM(l12princ, sym)}</p>` +
        note(`${t('stats.interest')}: ${fmtM(f12int, sym)}/1${t('years')} → ${fmtM(l12int, sym)}/${t('years')}${Math.ceil(rows.length / 12)}`),
    });
  }

  // ── 10. Payment range ──
  if (maxPmt - minPmt > firstPmt * 0.01) {
    result.push({
      icon: '📉', label: t('insights.paymentRange') || 'Payment range',
      value: `${fmtM(minPmt, sym)} – ${fmtM(maxPmt, sym)}`,
      desc: `Δ ${fmtM(maxPmt - minPmt, sym)}`,
      detail:
        `<div style="font-size:15px;font-weight:600;color:var(--blue);margin-bottom:14px">${fmtM(minPmt, sym)} – ${fmtM(maxPmt, sym)}</div>` +
        tbl([
          ['', sym],
          ['Max', fmtM(maxPmt, sym)],
          ['Min', fmtM(minPmt, sym)],
          ['Δ', val(fmtM(maxPmt - minPmt, sym))],
          ['1-й', fmtM(firstPmt, sym)],
        ]) +
        (propPrice > 0 ? note(`${fmtM(firstPmt, sym)} = ${(firstPmt / propPrice * 100).toFixed(2)}% ${t('property.price')}`) : ''),
    });
  }

  // ── 11. 50% salary rule (if property price is set) ──
  if (propPrice > 0) {
    const salaryNeeded = firstPmt * 2;
    result.push({
      icon: '💰', label: t('insights.salaryRule') || '50% salary rule',
      value: `≥ ${fmtM(salaryNeeded, sym)}`,
      desc: `${fmtM(firstPmt, sym)} × 2`,
      detail:
        `<div style="font-size:15px;font-weight:600;color:var(--gold);margin-bottom:14px">≥ ${fmtM(salaryNeeded, sym)}/${t('months')}</div>` +
        `<p style="font-size:12px;line-height:1.6">${t('insights.salaryRuleDesc') || 'Monthly payment must not exceed 50% of official salary.'}</p>` +
        tbl([
          [t('months') + ' 1', fmtM(firstPmt, sym)],
          ['× 2', val(fmtM(salaryNeeded, sym))],
        ]) +
        note('50% — max DTI (Serbia)'),
    });
  }

  // ── 12. Affordability check (if salary is set) ──
  {
    const salaryVal = Number(store.salary) || 0;
    if (salaryVal > 0) {
      const maxPmt50 = salaryVal * 0.5;
      const maxLoan50 = maxLoanFromPayment(maxPmt50, termMo, mRate);
      const affordable = firstPmt <= maxPmt50;
      const salaryNeeded = firstPmt * 2;
      const pctUsed = salaryVal > 0 ? (firstPmt / salaryVal) * 100 : 0;
      result.push({
        cls: affordable ? '' : 'warn',
        icon: affordable ? '✅' : '⚠️',
        label: t('affordability.salary'),
        value: affordable ? t('affordability.affordable') : t('affordability.notAffordable'),
        desc: `${fmtM(firstPmt, sym)} / ${fmtM(salaryVal, sym)} = ${pctUsed.toFixed(1)}%`,
        detail:
          `<div style="font-size:15px;font-weight:600;color:${affordable ? 'var(--green)' : 'var(--red)'};margin-bottom:14px">${affordable ? t('affordability.affordable') : t('affordability.notAffordable')}</div>` +
          tbl([
            [t('affordability.salary'), fmtM(salaryVal, sym)],
            ['50%', fmtM(maxPmt50, sym)],
            [t('stats.firstPayment'), affordable ? val(fmtM(firstPmt, sym)) : warn(fmtM(firstPmt, sym))],
            ['DTI', affordable ? val(pctUsed.toFixed(1) + '%') : warn(pctUsed.toFixed(1) + '%')],
          ]) +
          sec(t('affordability.maxLoan')) +
          `<p style="font-size:14px;font-weight:600;color:var(--blue)">${fmtM(Math.round(maxLoan50), sym)}</p>` +
          (!affordable ? note(`${t('affordability.salary')}: ≥ ${fmtM(Math.round(salaryNeeded), sym)}`) : ''),
      });
    }
  }

  return result;
});
</script>

<template>
  <div v-if="store.calculated" class="card" style="padding: 18px; margin-bottom: 16px">
    <ResultsPanel />
    <div
      class="insights-toggle"
      :class="{ collapsed }"
      @click="toggle"
    >
      <div style="display: flex; align-items: center; gap: 8px">
        <span class="section-title">{{ t('insights.title') }}</span>
        <span class="badge badge-green">{{ t('insights.badge') }}</span>
      </div>
      <ChevronDown :size="16" class="arr" />
    </div>
    <div
      class="insights-body-wrap"
      :class="{ collapsed }"
      :style="collapsed ? { maxHeight: '0' } : { maxHeight: cards.length * 200 + 'px' }"
    >
      <div style="padding-top: 12px">
        <div
          v-for="(card, i) in cards"
          :key="i"
          class="insight-card"
          :class="card.cls"
          @click="openInsight(card)"
        >
          <div class="insight-label"><span>{{ card.icon }}</span>{{ card.label }}</div>
          <div class="insight-value">{{ card.value }}</div>
          <div class="insight-desc">{{ card.desc }}</div>
          <div class="insight-click-hint"><ExternalLink :size="9" /> {{ t('insights.clickDetails') }}</div>
        </div>
      </div>
    </div>
  </div>

  <AppModal
    :open="modalOpen"
    :title="modalTitle"
    :body-html="modalBody"
    wide
    @close="modalOpen = false"
  />
</template>
