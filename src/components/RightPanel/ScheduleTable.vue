<script setup lang="ts">
import { computed } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import { fmt, SYM } from '@/utils/format';
import { exportCSV, exportExcel } from '@/utils/exportData';
import { exportPrintView } from '@/utils/exportPdf';
import type { ScheduleRow } from '@/types';
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue';

const store = useCalcStore();
const { t } = useI18n();

const totalPayment = computed(() =>
  store.activeSchedule.reduce((a: number, r: ScheduleRow) => a + r.payment, 0),
);
const totalPrincipal = computed(() =>
  store.activeSchedule.reduce((a: number, r: ScheduleRow) => a + r.principal, 0),
);
const totalInterest = computed(() =>
  store.activeSchedule.reduce((a: number, r: ScheduleRow) => a + r.interest, 0),
);
const totalEarly = computed(() =>
  store.activeSchedule.reduce((a: number, r: ScheduleRow) => a + r.earlyAmt, 0),
);

function doExportCSV() {
  exportCSV(store.activeSchedule, store.currency);
}

function doExportExcel() {
  exportExcel(store.activeSchedule, store.readParams(), store.payType);
}

function doPrint() {
  exportPrintView(store.readParams(), store.activeSchedule, store.payType, store.currency);
}
</script>

<template>
  <CollapsibleCard>
    <template #header>
      <span class="section-title">{{ t('table.title') }}</span>
    </template>
    <div style="display: flex; gap: 7px; margin-bottom: 10px; flex-wrap: wrap">
      <button class="btn-ghost" @click="doExportCSV">{{ t('table.csv') }}</button>
      <button class="btn-ghost" @click="doExportExcel">{{ t('table.excel') }}</button>
      <button class="btn-ghost" @click="doPrint">{{ t('table.print') }}</button>
    </div>
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th style="text-align: left">{{ t('table.headers.no') }}</th>
            <th>{{ t('table.headers.payment') }}</th>
            <th>{{ t('table.headers.principal') }}</th>
            <th>{{ t('table.headers.interest') }}</th>
            <th class="col-hide">{{ t('table.headers.extra') }}</th>
            <th>{{ t('table.headers.balance') }}</th>
            <th class="col-hide">{{ t('table.headers.rate') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in store.activeSchedule"
            :key="r.mo"
            :class="{ 'ep-row': r.earlyAmt > 0 }"
          >
            <td>
              <strong style="font-family: 'IBM Plex Mono'; font-size: 11px">#{{ r.mo }}</strong>
              <span style="display: block; font-size: 10px; color: var(--muted)">{{ r.date }}</span>
            </td>
            <td>{{ fmt(r.payment) }} {{ SYM[store.currency] }}</td>
            <td style="color: var(--blue)">{{ fmt(r.principal) }} {{ SYM[store.currency] }}</td>
            <td style="color: var(--gold)">{{ fmt(r.interest) }} {{ SYM[store.currency] }}</td>
            <td class="col-hide">
              <span v-if="r.earlyAmt > 0" class="badge" :class="r.earlyType === 'reduce_term' ? 'badge-blue' : 'badge-gold'">{{ fmt(r.earlyAmt) }} {{ SYM[store.currency] }}</span>
              <span v-else style="color: var(--muted)">—</span>
            </td>
            <td style="color: var(--muted)">{{ fmt(r.balance) }} {{ SYM[store.currency] }}</td>
            <td class="col-hide" style="color: var(--muted); font-size: 10px">{{ r.annRate.toFixed(2) }}%</td>
          </tr>
          <tr class="tfoot-row">
            <td>{{ t('table.total') }}</td>
            <td>{{ fmt(totalPayment) }} {{ SYM[store.currency] }}</td>
            <td style="color: var(--blue)">{{ fmt(totalPrincipal) }} {{ SYM[store.currency] }}</td>
            <td style="color: var(--gold)">{{ fmt(totalInterest) }} {{ SYM[store.currency] }}</td>
            <td class="col-hide" style="color: var(--green)">
              {{ totalEarly > 0 ? fmt(totalEarly) + ' ' + SYM[store.currency] : '—' }}
            </td>
            <td>—</td>
            <td class="col-hide">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  </CollapsibleCard>
</template>
