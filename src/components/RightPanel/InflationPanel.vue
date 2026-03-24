<script setup lang="ts">
import { computed } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import { fmtM, SYM } from '@/utils/format';
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue';

const store = useCalcStore();
const { t } = useI18n();

const milestoneYears = computed(() => {
  const termYears = Math.ceil(store.activeSchedule.length / 12);
  const candidates = [1, 5, 10, 15, 20, 25, 30];
  return candidates.filter((y) => y <= termYears);
});

interface InflationRow {
  year: number;
  nominal: number;
  real: number;
  lossPct: number;
}

const rows = computed<InflationRow[]>(() => {
  const schedule = store.activeSchedule;
  if (!schedule.length) return [];
  const rate = store.inflationRate / 100;

  return milestoneYears.value.map((year) => {
    const monthIdx = Math.min(year * 12 - 1, schedule.length - 1);
    const nominal = schedule[monthIdx].payment;
    const real = nominal / Math.pow(1 + rate, year);
    const lossPct = ((nominal - real) / nominal) * 100;
    return { year, nominal, real, lossPct };
  });
});

const summary = computed(() => {
  const schedule = store.activeSchedule;
  if (!schedule.length) return null;
  const lastRow = schedule[schedule.length - 1];
  const totalYears = schedule.length / 12;
  const rate = store.inflationRate / 100;
  const nominal = lastRow.payment;
  const real = nominal / Math.pow(1 + rate, totalYears);
  return { nominal, real };
});
</script>

<template>
  <CollapsibleCard v-if="store.calculated && store.activeSchedule.length">
    <template #header>
      <span class="section-title">{{ t('inflation.title') }}</span>
      <span class="badge badge-blue">{{ t('inflation.badge') }}</span>
    </template>

    <!-- Inflation rate slider -->
    <div style="margin-bottom: 14px">
      <label for="inflation-rate" style="font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; margin-bottom: 6px">
        {{ t('inflation.rate') }}
        <span class="rate-status" :class="store.inflationStatus">
          <span class="dot" />
          {{ store.inflationStatus === 'live' ? 'live' : store.inflationStatus === 'stale' ? 'offline' : '...' }}
        </span>
        <span style="font-size: 9px; opacity: .5">World Bank CPI</span>
      </label>
      <div style="display: flex; align-items: center; gap: 10px">
        <input
          id="inflation-rate"
          v-model.number="store.inflationRate"
          type="range"
          min="1"
          max="10"
          step="0.5"
          style="flex: 1; accent-color: var(--blue)"
        />
        <span
          style="
            font-family: 'IBM Plex Mono', monospace;
            font-size: 14px;
            color: var(--text);
            min-width: 40px;
            text-align: right;
          "
        >{{ store.inflationRate }}%</span>
      </div>
    </div>

    <!-- Table -->
    <div style="overflow-x: auto">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px">
        <thead>
          <tr style="border-bottom: 2px solid var(--border)">
            <th style="padding: 6px 8px; text-align: left; color: var(--muted); font-size: 11px; font-weight: 500">
              {{ t('inflation.year') }}
            </th>
            <th style="padding: 6px 8px; text-align: right; color: var(--muted); font-size: 11px; font-weight: 500">
              {{ t('inflation.nominal') }}
            </th>
            <th style="padding: 6px 8px; text-align: right; color: var(--muted); font-size: 11px; font-weight: 500">
              {{ t('inflation.real') }}
            </th>
            <th style="padding: 6px 8px; text-align: right; color: var(--muted); font-size: 11px; font-weight: 500">
              {{ t('inflation.loss') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.year"
            style="border-bottom: 1px solid var(--border)"
          >
            <td style="padding: 7px 8px; font-weight: 600; color: var(--text)">
              {{ row.year }}
            </td>
            <td style="padding: 7px 8px; text-align: right; font-family: 'IBM Plex Mono', monospace; color: var(--text)">
              {{ fmtM(row.nominal, SYM[store.currency]) }}
            </td>
            <td style="padding: 7px 8px; text-align: right; font-family: 'IBM Plex Mono', monospace; color: var(--blue)">
              {{ fmtM(row.real, SYM[store.currency]) }}
            </td>
            <td style="padding: 7px 8px; text-align: right; font-family: 'IBM Plex Mono', monospace; color: var(--red)">
              -{{ row.lossPct.toFixed(1) }}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Summary -->
    <div
      v-if="summary"
      style="
        margin-top: 12px;
        padding: 10px 14px;
        border-radius: 8px;
        background: rgba(96,165,250,.10);
        color: var(--blue);
        font-size: 13px;
        border: 1px solid rgba(96,165,250,.25);
      "
    >
      {{ t('inflation.summary', {
        nominal: fmtM(summary.nominal, SYM[store.currency]),
        real: fmtM(summary.real, SYM[store.currency])
      }) }}
    </div>
  </CollapsibleCard>
</template>
