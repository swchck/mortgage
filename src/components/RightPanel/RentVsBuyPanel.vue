<script setup lang="ts">
import { computed } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import { fmt, SYM } from '@/utils/format';
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue';

const store = useCalcStore();
const { t } = useI18n();

const analysis = computed(() => store.rentVsBuyAnalysis);

const breakEvenDate = computed(() => {
  const a = analysis.value;
  if (!a || a.breakEvenMonth === null) return null;
  const rows = store.activeSchedule;
  const row = rows.find((r) => r.mo === a.breakEvenMonth);
  return row?.date ?? null;
});

const lastMonth = computed(() => {
  const a = analysis.value;
  if (!a || !a.months.length) return null;
  return a.months[a.months.length - 1];
});

const sym = computed(() => SYM[store.currency]);
</script>

<template>
  <CollapsibleCard v-if="analysis && analysis.months.length">
    <template #header>
      <span class="section-title">{{ t('rentVsBuy.title') }}</span>
      <span class="badge badge-blue">{{ t('rentVsBuy.badge') }}</span>
    </template>

    <!-- Break-even result -->
    <div
      style="
        padding: 14px 16px;
        border-radius: 10px;
        margin-bottom: 14px;
        border: 1px solid var(--border);
        background: var(--surface2);
      "
    >
      <div v-if="analysis.breakEvenMonth !== null" style="text-align: center">
        <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px">
          {{ t('rentVsBuy.breakeven') }}
        </div>
        <div style="font-size: 28px; font-weight: 700; color: var(--green); font-family: 'IBM Plex Mono', monospace">
          {{ analysis.breakEvenMonth }} {{ t('months') }}
        </div>
        <div v-if="breakEvenDate" style="font-size: 12px; color: var(--muted); margin-top: 4px">
          {{ breakEvenDate }}
        </div>
      </div>
      <div v-else style="text-align: center">
        <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px">
          {{ t('rentVsBuy.breakeven') }}
        </div>
        <div style="font-size: 18px; font-weight: 600; color: var(--red)">
          {{ t('rentVsBuy.never') }}
        </div>
      </div>
    </div>

    <!-- Summary stats -->
    <div v-if="lastMonth" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px">
      <div style="padding: 10px 12px; border-radius: 8px; background: var(--surface2); border: 1px solid var(--border)">
        <div style="font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px">
          {{ t('rentVsBuy.rentTotal') }}
        </div>
        <div style="font-size: 14px; font-weight: 600; color: var(--gold); font-family: 'IBM Plex Mono', monospace">
          {{ fmt(lastMonth.rentCum) }} {{ sym }}
        </div>
      </div>
      <div style="padding: 10px 12px; border-radius: 8px; background: var(--surface2); border: 1px solid var(--border)">
        <div style="font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px">
          {{ t('rentVsBuy.buyTotal') }}
        </div>
        <div style="font-size: 14px; font-weight: 600; color: var(--blue); font-family: 'IBM Plex Mono', monospace">
          {{ fmt(lastMonth.buyCum) }} {{ sym }}
        </div>
      </div>
      <div style="padding: 10px 12px; border-radius: 8px; background: var(--surface2); border: 1px solid var(--border)">
        <div style="font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px">
          {{ t('rentVsBuy.equity') }}
        </div>
        <div style="font-size: 14px; font-weight: 600; color: var(--green); font-family: 'IBM Plex Mono', monospace">
          {{ fmt(lastMonth.equity) }} {{ sym }}
        </div>
      </div>
    </div>
  </CollapsibleCard>
</template>
