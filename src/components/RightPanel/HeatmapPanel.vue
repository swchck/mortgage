<script setup lang="ts">
import { computed } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue';

const store = useCalcStore();
const { t } = useI18n();

interface HeatCell {
  pct: number;
  color: string;
}

function heatColor(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  if (clamped < 33) return `rgba(52, 211, 153, ${(0.3 + clamped / 100).toFixed(2)})`;
  if (clamped < 66) return `rgba(240, 180, 41, ${(0.3 + clamped / 100).toFixed(2)})`;
  return `rgba(248, 113, 113, ${(0.3 + clamped / 100).toFixed(2)})`;
}

// Transposed: rows = months (12), columns = years
const years = computed<number[]>(() => {
  const set = new Set<number>();
  for (const row of store.activeSchedule) {
    const y = parseInt(row.date.split('.')[2], 10);
    if (!isNaN(y)) set.add(y);
  }
  return [...set].sort((a, b) => a - b);
});

const grid = computed<Map<string, HeatCell>>(() => {
  const map = new Map<string, HeatCell>();
  for (const row of store.activeSchedule) {
    const parts = row.date.split('.');
    const y = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10) - 1;
    if (isNaN(y) || isNaN(m)) continue;
    const totalPmt = row.payment + row.earlyAmt;
    const pct = totalPmt > 0 ? (row.interest / totalPmt) * 100 : 0;
    map.set(`${m}-${y}`, { pct, color: heatColor(pct) });
  }
  return map;
});

function getCell(month: number, year: number): HeatCell | null {
  return grid.value.get(`${month}-${year}`) ?? null;
}

const monthLabels = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
</script>

<template>
  <CollapsibleCard :default-open="false">
    <template #header>
      <span class="section-title">{{ t('heatmap.title') }}</span>
      <span class="badge badge-gold">{{ t('heatmap.badge') }}</span>
    </template>

    <div style="overflow-x: auto">
      <table class="heatmap-table">
        <thead>
          <tr>
            <th class="heatmap-month-header"></th>
            <th v-for="y in years" :key="y" class="heatmap-month-header">{{ y }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(ml, mi) in monthLabels" :key="mi">
            <td class="heatmap-year-label">{{ ml }}</td>
            <td
              v-for="y in years"
              :key="y"
              class="heatmap-cell"
              :style="getCell(mi, y) ? { backgroundColor: getCell(mi, y)!.color } : {}"
              :title="getCell(mi, y) ? `${t('heatmap.interestShare')}: ${getCell(mi, y)!.pct.toFixed(1)}%` : ''"
            >
              <span v-if="getCell(mi, y)" class="heatmap-pct">{{ getCell(mi, y)!.pct.toFixed(0) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend -->
    <div class="heatmap-legend">
      <span class="heatmap-legend-label">{{ t('heatmap.legend') }}</span>
      <div class="heatmap-legend-bar">
        <span class="heatmap-legend-end">0%</span>
        <div class="heatmap-gradient"></div>
        <span class="heatmap-legend-end">100%</span>
      </div>
    </div>
  </CollapsibleCard>
</template>

<style scoped>
.heatmap-table {
  border-collapse: separate !important;
  border-spacing: 3px !important;
  width: auto !important;
  min-width: auto;
}
.heatmap-table :deep(th),
.heatmap-month-header {
  font-size: 9px !important;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-align: center !important;
  padding: 4px 2px !important;
  font-family: 'Inter', sans-serif;
  border-bottom: none !important;
  position: static !important;
  background: transparent !important;
  text-transform: none !important;
  white-space: nowrap;
}
.heatmap-year-header {
  width: 48px;
  border-bottom: none !important;
  position: static !important;
  background: transparent !important;
}
.heatmap-year-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  text-align: left;
  padding: 0 6px 0 0;
  white-space: nowrap;
  border-bottom: none;
}
.heatmap-cell {
  width: 38px;
  height: 32px;
  border-radius: 4px;
  text-align: center;
  vertical-align: middle;
  background: var(--surface2);
  border: 1px solid var(--border);
  transition: background-color 0.2s;
  padding: 0;
  font-family: 'IBM Plex Mono', monospace;
  border-bottom: none;
}
.heatmap-cell:hover {
  border-color: var(--gold);
}
.heatmap-pct {
  font-size: 10px;
  font-weight: 600;
  color: var(--text);
  line-height: 32px;
}
.heatmap-legend {
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.heatmap-legend-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  font-family: 'Inter', sans-serif;
  white-space: nowrap;
}
.heatmap-legend-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  max-width: 260px;
}
.heatmap-legend-end {
  font-size: 9px;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  white-space: nowrap;
}
.heatmap-gradient {
  flex: 1;
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(
    to right,
    rgba(52, 211, 153, 0.6),
    rgba(240, 180, 41, 0.65),
    rgba(248, 113, 113, 0.85)
  );
  border: 1px solid var(--border);
}
</style>
