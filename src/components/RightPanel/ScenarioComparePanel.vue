<script setup lang="ts">
import { computed } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import { fmt } from '@/utils/format';
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue';

const store = useCalcStore();
const { t } = useI18n();

interface Row {
  key: string;
  label: string;
  a: string;
  b: string;
  deltaNum: number;
  deltaStr: string;
  lowerIsBetter: boolean;
}

function fmtTerm(mo: number): string {
  const y = Math.floor(mo / 12);
  const m = mo % 12;
  return y > 0 ? `${y} ${t('years')} ${m} ${t('months')}` : `${m} ${t('months')}`;
}

const rows = computed<Row[]>(() => {
  const a = store.scenarioA;
  const b = store.scenarioB;
  if (!a || !b) return [];

  const sym = store.sym;

  const defs: { key: string; label: string; aVal: number; bVal: number; isMoney: boolean; isTerm: boolean; lowerIsBetter: boolean }[] = [
    { key: 'loan', label: t('loanAmount'), aVal: a.loan, bVal: b.loan, isMoney: true, isTerm: false, lowerIsBetter: true },
    { key: 'term', label: t('stats.actualTerm'), aVal: a.actualTermMo, bVal: b.actualTermMo, isMoney: false, isTerm: true, lowerIsBetter: true },
    { key: 'rate', label: t('fixedRate'), aVal: a.rate, bVal: b.rate, isMoney: false, isTerm: false, lowerIsBetter: true },
    { key: 'payment', label: t('stats.monthlyPayment'), aVal: a.monthlyPayment, bVal: b.monthlyPayment, isMoney: true, isTerm: false, lowerIsBetter: true },
    { key: 'total', label: t('stats.totalPayments'), aVal: a.totalPayments, bVal: b.totalPayments, isMoney: true, isTerm: false, lowerIsBetter: true },
    { key: 'interest', label: t('stats.totalInterest'), aVal: a.totalInterest, bVal: b.totalInterest, isMoney: true, isTerm: false, lowerIsBetter: true },
    { key: 'overpayment', label: t('stats.overpayment'), aVal: a.overpayment, bVal: b.overpayment, isMoney: true, isTerm: false, lowerIsBetter: true },
  ];

  return defs.map((d) => {
    const delta = d.bVal - d.aVal;
    let aStr: string, bStr: string, deltaStr: string;
    if (d.isTerm) {
      aStr = fmtTerm(d.aVal);
      bStr = fmtTerm(d.bVal);
      const dm = Math.abs(delta);
      deltaStr = delta === 0 ? '0' : (delta > 0 ? '+' : '-') + fmtTerm(dm);
    } else if (d.isMoney) {
      aStr = fmt(d.aVal) + ' ' + sym;
      bStr = fmt(d.bVal) + ' ' + sym;
      deltaStr = (delta >= 0 ? '+' : '') + fmt(delta) + ' ' + sym;
    } else {
      aStr = d.aVal.toFixed(2) + '%';
      bStr = d.bVal.toFixed(2) + '%';
      deltaStr = (delta >= 0 ? '+' : '') + delta.toFixed(2) + ' pp';
    }
    return {
      key: d.key,
      label: d.label,
      a: aStr,
      b: bStr,
      deltaNum: delta,
      deltaStr,
      lowerIsBetter: d.lowerIsBetter,
    };
  });
});

function deltaColor(row: Row): string {
  if (row.deltaNum === 0) return 'var(--muted)';
  const isBetter = row.lowerIsBetter ? row.deltaNum < 0 : row.deltaNum > 0;
  return isBetter ? 'var(--green)' : 'var(--red)';
}
</script>

<template>
  <CollapsibleCard v-if="store.scenarioA && store.scenarioB">
    <template #header>
      <span class="section-title">{{ t('scenario.title') }}</span>
      <span class="badge badge-blue">{{ t('scenario.badge') }}</span>
    </template>

    <div style="overflow-x:auto;padding-top:14px">
      <table class="scenario-table">
        <thead>
          <tr>
            <th></th>
            <th>{{ t('scenario.scenarioA') }}</th>
            <th>{{ t('scenario.scenarioB') }}</th>
            <th>{{ t('scenario.delta') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key">
            <td class="scenario-label">{{ row.label }}</td>
            <td class="scenario-val">{{ row.a }}</td>
            <td class="scenario-val">{{ row.b }}</td>
            <td class="scenario-delta" :style="{ color: deltaColor(row) }">
              {{ row.deltaStr }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </CollapsibleCard>
</template>

<style scoped>
.scenario-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.scenario-table th {
  text-align: left;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .04em;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
}
.scenario-table td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--tbl-sep);
}
.scenario-label {
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}
.scenario-val {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  white-space: nowrap;
}
.scenario-delta {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
