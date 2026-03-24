<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import { fmtM, SYM } from '@/utils/format';
import { computePSK } from '@/utils/calc';
import AppModal from '@/components/ui/AppModal.vue';
import type { ScheduleRow } from '@/types';

const store = useCalcStore();
const { t } = useI18n();

const modalOpen = ref(false);
const modalTitle = ref('');
const modalBody = ref('');

interface StatCard {
  lbl: string;
  val: string;
  cls: string;
  wide?: boolean;
  detail?: string;
}

function openStat(card: StatCard) {
  if (!card.detail) return;
  modalTitle.value = card.lbl;
  modalBody.value = card.detail;
  modalOpen.value = true;
}

const data = computed(() => {
  const rows = store.activeSchedule;
  if (!rows.length) return null;
  const s = SYM[store.currency];
  const loan = store.loan;
  const totPmt = rows.reduce((a: number, r: ScheduleRow) => a + r.payment + r.earlyAmt, 0);
  const totInt = rows.reduce((a: number, r: ScheduleRow) => a + r.interest, 0);
  const totPrinc = rows.reduce((a: number, r: ScheduleRow) => a + r.principal, 0);
  const totEarly = rows.reduce((a: number, r: ScheduleRow) => a + r.earlyAmt, 0);
  const over = totPmt - loan;
  const { psk, ear } = computePSK(loan, rows);
  const isDiff = store.payType === 'diff';
  const yrs = Math.floor(rows.length / 12);
  const mos = rows.length % 12;
  const termStr = (yrs ? yrs + ' ' + t('years') + ' ' : '') + (mos ? mos + ' ' + t('months') : '');
  const princPct = ((loan / totPmt) * 100).toFixed(1);
  const intPct = ((totInt / totPmt) * 100).toFixed(1);

  const firstPmt = rows[0].payment;
  const lastPmt = rows[rows.length - 1].payment;
  const maxPmt = Math.max(...rows.map((r: ScheduleRow) => r.payment));
  const minPmt = Math.min(...rows.map((r: ScheduleRow) => r.payment));
  const avgPmt = totPmt / rows.length;
  const annRate = rows[0].annRate;

  const stats: StatCard[] = [];

  // Payment info
  stats.push({
    lbl: isDiff ? t('stats.firstPayment') : t('stats.monthlyPayment'),
    val: fmtM(firstPmt, s),
    cls: '',
    detail: isDiff
      ? `<p style="font-size:13px;line-height:1.7">${t('stats.firstPayment')}: <strong>${fmtM(firstPmt, s)}</strong><br>${t('stats.lastPayment')}: <strong>${fmtM(lastPmt, s)}</strong><br>Max: ${fmtM(maxPmt, s)}<br>Min: ${fmtM(minPmt, s)}<br>Δ: ${fmtM(maxPmt - minPmt, s)}</p>`
      : `<p style="font-size:13px;line-height:1.7">${fmtM(firstPmt, s)} × ${rows.length} ${t('months')} = ${fmtM(firstPmt * rows.length, s)}</p><p style="font-size:12px;color:var(--muted);margin-top:8px">${t('stats.principal')}: ${fmtM(totPrinc, s)}<br>${t('stats.interest')}: ${fmtM(totInt, s)}</p>`,
  });

  stats.push({
    lbl: isDiff ? t('stats.lastPayment') : t('stats.overpayment'),
    val: isDiff ? fmtM(lastPmt, s) : fmtM(over, s),
    cls: isDiff ? 'green' : 'red',
    detail: isDiff
      ? `<p style="font-size:13px;line-height:1.7">${fmtM(lastPmt, s)} — ${t('stats.lastPayment')}<br>${fmtM(firstPmt, s)} — ${t('stats.firstPayment')}<br>Δ: ${fmtM(firstPmt - lastPmt, s)}</p>`
      : `<p style="font-size:13px;line-height:1.7">${t('stats.overpayment')}: <strong style="color:var(--red)">${fmtM(over, s)}</strong></p><p style="font-size:12px;color:var(--muted);margin-top:6px">${fmtM(totPmt, s)} − ${fmtM(loan, s)} = ${fmtM(over, s)}<br>${(over / loan * 100).toFixed(1)}% ${t('stats.principal').toLowerCase()}</p>`,
  });

  stats.push({
    lbl: t('stats.totalPayments'),
    val: fmtM(totPmt, s),
    cls: '',
    detail: `<table style="width:100%;border-collapse:collapse;font-size:12px"><tr><td style="padding:5px 0">${t('stats.principal')}</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace"><strong>${fmtM(loan, s)}</strong></td></tr><tr><td style="padding:5px 0">${t('stats.totalInterest')}</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--gold)">${fmtM(totInt, s)}</td></tr>${totEarly > 0 ? `<tr><td style="padding:5px 0">${t('earlyPayments.title')}</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--green)">${fmtM(totEarly, s)}</td></tr>` : ''}<tr style="border-top:2px solid var(--border)"><td style="padding:8px 0;font-weight:700">${t('stats.totalPayments')}</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace;font-weight:700">${fmtM(totPmt, s)}</td></tr></table>`,
  });

  // Interest and rates
  stats.push({
    lbl: t('stats.totalInterest'),
    val: fmtM(totInt, s),
    cls: 'gold',
    detail: `<p style="font-size:13px;line-height:1.7">${fmtM(totInt, s)} — ${(totInt / loan * 100).toFixed(1)}% ${t('stats.principal').toLowerCase()}</p><p style="font-size:12px;color:var(--muted);margin-top:8px">${t('stats.interest')}: ${intPct}%<br>${t('stats.principal')}: ${princPct}%</p><div style="margin-top:10px;height:12px;border-radius:6px;overflow:hidden;display:flex"><div style="width:${princPct}%;background:var(--blue)"></div><div style="width:${intPct}%;background:var(--gold)"></div></div>`,
  });

  stats.push({
    lbl: t('stats.psk'),
    val: psk.toFixed(2) + '%',
    cls: 'gold',
    detail: `<p style="font-size:13px;line-height:1.7"><strong>${psk.toFixed(2)}%</strong> — ${t('stats.psk')}</p><p style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.7">ПСК (полная стоимость кредита) — номинальная годовая ставка, при которой дисконтированный денежный поток равен сумме кредита. Учитывает все платежи, включая досрочные.</p><p style="font-size:12px;color:var(--muted);margin-top:6px">IRR × 12 = ${psk.toFixed(2)}%</p>`,
  });

  stats.push({
    lbl: t('stats.ear'),
    val: ear.toFixed(2) + '%',
    cls: '',
    detail: `<p style="font-size:13px;line-height:1.7"><strong>${ear.toFixed(2)}%</strong> — ${t('stats.ear')}</p><p style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.7">EAR (Effective Annual Rate) — эффективная годовая ставка с учётом капитализации. Показывает реальную стоимость кредита в годовом выражении.</p><p style="font-size:12px;color:var(--muted);margin-top:6px">(1 + IRR)^12 − 1 = ${ear.toFixed(2)}%<br>${t('fixedRate')}: ${annRate.toFixed(2)}%</p>`,
  });

  // Index rate
  if (store.rateType === 'index') {
    stats.push({
      lbl: t('indexLabel') + ' + ' + t('spreadLabel'),
      val: store.indexRate.toFixed(2) + '% + ' + store.spread.toFixed(2) + '% = ' + store.totalRate.toFixed(2) + '%',
      cls: 'gold',
      detail: `<p style="font-size:13px;line-height:1.7">${t('indexLabel')}: <strong>${store.indexRate.toFixed(2)}%</strong><br>${t('spreadLabel')}: <strong>${store.spread.toFixed(2)}%</strong><br>= <strong>${store.totalRate.toFixed(2)}%</strong></p>`,
    });
  }

  // Early payments
  if (totEarly > 0) {
    const epCount = rows.filter((r: ScheduleRow) => r.earlyAmt > 0).length;
    const avgEarly = totEarly / epCount;
    stats.push({
      lbl: t('earlyPayments.title'),
      val: fmtM(totEarly, s) + ' (' + epCount + ')',
      cls: 'green',
      detail: `<p style="font-size:13px;line-height:1.7">${fmtM(totEarly, s)} — ${epCount} ${t('months')}</p><p style="font-size:12px;color:var(--muted);margin-top:8px">~${fmtM(avgEarly, s)} / ${t('months')}</p>`,
    });
  }

  // Acquisition costs
  const acqCosts = store.totalAcquisitionCostsInMainCurrency;
  if (acqCosts > 0) {
    const fixedCosts = store.totalFixedCosts;
    const pctCosts = store.totalPctCosts;
    stats.push({
      lbl: t('stats.acquisitionCosts'),
      val: fmtM(acqCosts, s),
      cls: 'red',
      detail: `<p style="font-size:13px;line-height:1.7">${fmtM(acqCosts, s)}</p><p style="font-size:12px;color:var(--muted);margin-top:6px">${store.acquisitionCosts.length} позиций<br>Фикс.: ${fmtM(fixedCosts, store.costsSym)}<br>%: ${fmtM(pctCosts, store.costsSym)}</p>`,
    });
    stats.push({
      lbl: t('stats.grandTotal'),
      val: fmtM(totPmt + acqCosts, s),
      cls: '',
      detail: `<table style="width:100%;border-collapse:collapse;font-size:12px"><tr><td style="padding:5px 0">${t('stats.totalPayments')}</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace">${fmtM(totPmt, s)}</td></tr><tr><td style="padding:5px 0">${t('stats.acquisitionCosts')}</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--red)">${fmtM(acqCosts, s)}</td></tr><tr style="border-top:2px solid var(--border)"><td style="padding:8px 0;font-weight:700">${t('stats.grandTotal')}</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace;font-weight:700">${fmtM(totPmt + acqCosts, s)}</td></tr></table>`,
    });
  }

  // Term card
  const origTermMo = store.termYears * 12 + store.termMonths;
  const saved = origTermMo - rows.length;
  stats.push({
    lbl: t('stats.actualTerm'),
    val: termStr,
    cls: 'blue',
    detail: `<p style="font-size:13px;line-height:1.7"><strong>${termStr}</strong> (${rows.length} ${t('months')})</p>` +
      (saved > 0 ? `<p style="font-size:12px;color:var(--green);margin-top:6px">−${saved} ${t('months')} vs ${origTermMo} ${t('months')}</p>` : '') +
      `<p style="font-size:12px;color:var(--muted);margin-top:8px">~${fmtM(avgPmt, s)} / ${t('months')}</p>`,
  });

  return { stats, princPct, intPct, loan: loan, termMo: rows.length, avgPmt };
});

</script>

<template>
  <div v-if="data">
    <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px">
      <div
        v-for="(st, i) in data.stats"
        :key="i"
        class="stat fade-in"
        :style="st.detail ? { cursor: 'pointer' } : {}"
        @click="openStat(st)"
      >
        <div class="stat-lbl">{{ st.lbl }}</div>
        <div class="stat-val" :class="st.cls" :title="st.val">{{ st.val }}</div>
      </div>
    </div>
    <!-- Debt structure -->
    <div class="stat" style="padding: 10px 16px; margin-bottom: 16px">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px">
        <span style="font-size: 10px; font-weight: 600; color: var(--blue); font-family: 'Inter', sans-serif">{{ t('stats.principal') }} · {{ data.princPct }}%</span>
        <span style="font-size: 10px; font-weight: 600; color: var(--gold); font-family: 'Inter', sans-serif">{{ data.intPct }}% · {{ t('stats.interest') }}</span>
      </div>
      <div class="pbar-track" style="height: 8px">
        <div class="pbar-fill" :style="{ width: data.princPct + '%', background: 'var(--blue)' }" />
        <div class="pbar-fill" :style="{ width: data.intPct + '%', background: 'var(--gold)' }" />
      </div>
    </div>
  </div>

  <AppModal
    :open="modalOpen"
    :title="modalTitle"
    :body-html="modalBody"
    @close="modalOpen = false"
  />
</template>
