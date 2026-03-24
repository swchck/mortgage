<script setup lang="ts">
import { computed } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import { fmt, SYM } from '@/utils/format';
import { cvt } from '@/services/fx';
import type { ScheduleRow } from '@/types';
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue';

const store = useCalcStore();
const { t, locale } = useI18n();

function costLabel(cost: { labelRu: string; labelEn: string; labelSr: string }) {
  if (locale.value === 'en') return cost.labelEn;
  if (locale.value === 'sr') return cost.labelSr;
  return cost.labelRu;
}

const hasCosts = computed(() => store.totalAcquisitionCosts > 0);
const costsSym = computed(() => SYM[store.costsCurrency]);

const grandTotal = computed(() => {
  const mortTotal = store.activeSchedule.reduce((a: number, r: ScheduleRow) => a + r.payment + r.earlyAmt, 0);
  return mortTotal + store.totalAcquisitionCostsInMainCurrency;
});
</script>

<template>
  <CollapsibleCard v-if="hasCosts && store.calculated">
    <template #header>
      <span class="section-title">{{ t('costs.title') }}</span>
    </template>
    <div style="font-size: 12px; display: flex; flex-direction: column; gap: 5px">
      <div
        v-for="cost in store.acquisitionCosts"
        :key="cost.key"
        style="display: flex; justify-content: space-between; color: var(--muted)"
      >
        <span>{{ costLabel(cost) || '—' }}</span>
        <span style="color: var(--text); font-family: 'IBM Plex Mono'; font-size: 12px">
          <template v-if="cost.type === 'fixed'">{{ fmt(cost.value) }} {{ costsSym }}</template>
          <template v-else>
            {{ cost.value }}%
            <template v-if="Number(store.propPrice) > 0">
              = {{ fmt(cvt(Number(store.propPrice), store.currency, store.costsCurrency, store.fxRates) * cost.value / 100) }} {{ costsSym }}
            </template>
          </template>
        </span>
      </div>
      <hr />
      <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--gold); font-size: 14px">
        <span>{{ t('costs.total') }}</span>
        <span>{{ fmt(store.totalAcquisitionCosts) }} {{ costsSym }}</span>
      </div>
      <div v-if="store.costsCurrency !== store.currency" style="display: flex; justify-content: space-between; color: var(--muted); font-size: 11px">
        <span></span>
        <span>≈ {{ fmt(store.totalAcquisitionCostsInMainCurrency) }} {{ SYM[store.currency] }}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--text); font-size: 13px; margin-top: 4px">
        <span>{{ t('costs.grand') }}</span>
        <span>{{ fmt(grandTotal) }} {{ SYM[store.currency] }}</span>
      </div>
    </div>
  </CollapsibleCard>
</template>
