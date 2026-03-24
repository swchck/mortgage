<script setup lang="ts">
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import { BarChart3 } from 'lucide-vue-next';
import InsightsPanel from './InsightsPanel.vue';
import MilestonesPanel from './MilestonesPanel.vue';
import ChartPanel from './ChartPanel.vue';
import ScheduleTable from './ScheduleTable.vue';
import CostsSummaryPanel from './CostsSummaryPanel.vue';
import StressTestPanel from './StressTestPanel.vue';
import InflationPanel from './InflationPanel.vue';
import RentVsBuyPanel from './RentVsBuyPanel.vue';
import ScenarioComparePanel from './ScenarioComparePanel.vue';
import HeatmapPanel from './HeatmapPanel.vue';

const store = useCalcStore();
const { t } = useI18n();
</script>

<template>
  <div>
    <!-- Empty state -->
    <div v-if="!store.calculated" class="card fade-in" style="padding: 55px 20px; text-align: center">
      <div style="margin-bottom: 12px; color: var(--muted); opacity: .5"><BarChart3 :size="48" /></div>
      <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 21px; color: var(--muted); margin-bottom: 7px">
        {{ t('emptyState.title') }}
      </h2>
      <p style="font-size: 13px; color: var(--muted); opacity: .6">{{ t('emptyState.desc') }}</p>
    </div>

    <!-- Results -->
    <div v-if="store.calculated" class="fade-in">
      <ScenarioComparePanel />
      <InsightsPanel />
      <StressTestPanel />
      <InflationPanel />
      <MilestonesPanel />
      <ChartPanel />
      <HeatmapPanel />
      <ScheduleTable />
      <RentVsBuyPanel />
      <CostsSummaryPanel />
    </div>
  </div>
</template>
