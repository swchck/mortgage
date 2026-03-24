<script setup lang="ts">
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import { fmtM, SYM } from '@/utils/format';
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue';

const store = useCalcStore();
const { t } = useI18n();

function severity(delta: number): string {
  if (delta === 1) return 'rgba(248,113,113,.25)';
  if (delta === 2) return 'rgba(248,113,113,.50)';
  return 'rgba(248,113,113,.75)';
}
</script>

<template>
  <CollapsibleCard v-if="store.calculated && store.stressTestResults.length">
    <template #header>
      <span class="section-title">{{ t('stressTest.title') }}</span>
      <span class="badge badge-red">{{ t('stressTest.badge') }}</span>
    </template>

    <div
      v-if="store.rateType === 'index'"
      style="
        padding: 8px 12px;
        border-radius: 8px;
        background: rgba(248,113,113,.12);
        color: var(--red);
        font-size: 12px;
        margin-bottom: 12px;
        border: 1px solid rgba(248,113,113,.25);
      "
    >
      {{ t('stressTest.warning') }}
    </div>

    <div style="overflow-x: auto">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px">
        <thead>
          <tr style="border-bottom: 2px solid var(--border)">
            <th style="padding: 6px 8px; text-align: left; color: var(--muted); font-size: 11px; font-weight: 500">
              {{ t('stressTest.delta') }}
            </th>
            <th style="padding: 6px 8px; text-align: right; color: var(--muted); font-size: 11px; font-weight: 500">
              {{ t('stressTest.newRate') }}
            </th>
            <th style="padding: 6px 8px; text-align: right; color: var(--muted); font-size: 11px; font-weight: 500">
              {{ t('stressTest.newPayment') }}
            </th>
            <th style="padding: 6px 8px; text-align: right; color: var(--muted); font-size: 11px; font-weight: 500">
              {{ t('stressTest.increase') }}
            </th>
            <th style="padding: 6px 8px; text-align: right; color: var(--muted); font-size: 11px; font-weight: 500">
              {{ t('stressTest.totalExtra') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in store.stressTestResults"
            :key="row.delta"
            :style="{ background: severity(row.delta) }"
            style="border-bottom: 1px solid var(--border)"
          >
            <td style="padding: 7px 8px; font-weight: 600; color: var(--red)">
              +{{ row.delta }}%
            </td>
            <td style="padding: 7px 8px; text-align: right; font-family: 'IBM Plex Mono', monospace; color: var(--text)">
              {{ row.newRate.toFixed(2) }}%
            </td>
            <td style="padding: 7px 8px; text-align: right; font-family: 'IBM Plex Mono', monospace; color: var(--text)">
              {{ fmtM(row.newPmt, SYM[store.currency]) }}
            </td>
            <td style="padding: 7px 8px; text-align: right; font-family: 'IBM Plex Mono', monospace; color: var(--red)">
              +{{ fmtM(row.pmtIncrease, SYM[store.currency]) }}
              <span style="font-size: 11px; color: var(--muted); margin-left: 4px">
                (+{{ row.pmtIncreasePct.toFixed(1) }}%)
              </span>
            </td>
            <td style="padding: 7px 8px; text-align: right; font-family: 'IBM Plex Mono', monospace; color: var(--red)">
              +{{ fmtM(row.totalExtra, SYM[store.currency]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </CollapsibleCard>
</template>
