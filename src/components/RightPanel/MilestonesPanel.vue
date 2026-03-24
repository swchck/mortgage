<script setup lang="ts">
import { computed } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import { findMilestones } from '@/utils/calc';
import type { Milestone } from '@/utils/calc';
import { fmtM, SYM } from '@/utils/format';
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue';

const store = useCalcStore();
const { t } = useI18n();

const milestones = computed<Milestone[]>(() => {
  const rows = store.activeSchedule;
  if (!rows.length) return [];
  return findMilestones(rows, store.loan);
});

const sym = computed(() => SYM[store.currency]);

function milestoneIcon(type: Milestone['type']): string {
  switch (type) {
    case '25%': return '25%';
    case '50%': return '50%';
    case '75%': return '75%';
    case '100%': return '100%';
    case 'principal_gt_interest': return 'P>I';
  }
}

function milestoneLabel(type: Milestone['type']): string {
  if (type === 'principal_gt_interest') {
    return t('milestones.principalGtInterest');
  }
  return t('milestones.principalPaid', { pct: type });
}

function milestoneColor(type: Milestone['type']): string {
  switch (type) {
    case '25%': return 'var(--blue)';
    case '50%': return 'var(--gold)';
    case '75%': return 'var(--green)';
    case '100%': return 'var(--green)';
    case 'principal_gt_interest': return 'var(--gold)';
  }
}

function yearsMonths(mo: number): string {
  const y = Math.floor(mo / 12);
  const m = mo % 12;
  if (y > 0 && m > 0) return `${y} ${t('years')} ${m} ${t('months')}`;
  if (y > 0) return `${y} ${t('years')}`;
  return `${m} ${t('months')}`;
}
</script>

<template>
  <CollapsibleCard v-if="milestones.length" :default-open="false" class="fade-in">
    <template #header>
      <span class="section-title">{{ t('milestones.title') }}</span>
      <span class="badge badge-blue">{{ t('milestones.badge') }}</span>
    </template>

    <div class="milestones-timeline">
      <div
        v-for="(ms, i) in milestones"
        :key="i"
        class="milestone-item"
      >
        <div class="milestone-line-wrap">
          <div
            class="milestone-dot"
            :style="{ background: milestoneColor(ms.type), boxShadow: '0 0 0 3px ' + milestoneColor(ms.type) + '33' }"
          />
          <div v-if="i < milestones.length - 1" class="milestone-line" />
        </div>
        <div class="milestone-content">
          <div class="milestone-header">
            <span class="milestone-badge" :style="{ background: milestoneColor(ms.type) + '1a', color: milestoneColor(ms.type), borderColor: milestoneColor(ms.type) + '33' }">
              {{ milestoneIcon(ms.type) }}
            </span>
            <span class="milestone-label">{{ milestoneLabel(ms.type) }}</span>
          </div>
          <div class="milestone-details">
            <span class="milestone-date">{{ ms.date }}</span>
            <span class="milestone-sep">&middot;</span>
            <span class="milestone-months">{{ yearsMonths(ms.month) }}</span>
          </div>
          <div class="milestone-balance">
            {{ t('milestones.remaining') }}: {{ fmtM(ms.balance, sym) }}
          </div>
        </div>
      </div>
    </div>
  </CollapsibleCard>
</template>

<style scoped>
.milestones-timeline {
  display: flex;
  flex-direction: column;
}
.milestone-item {
  display: flex;
  gap: 12px;
  min-height: 56px;
}
.milestone-line-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 14px;
  flex-shrink: 0;
}
.milestone-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}
.milestone-line {
  width: 2px;
  flex: 1;
  background: var(--border);
  margin: 4px 0;
}
.milestone-content {
  flex: 1;
  padding-bottom: 14px;
}
.milestone-item:last-child .milestone-content {
  padding-bottom: 0;
}
.milestone-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.milestone-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .06em;
  font-family: 'IBM Plex Mono', monospace;
  border: 1px solid;
}
.milestone-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  font-family: 'Inter', sans-serif;
}
.milestone-details {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--muted);
  font-family: 'Inter', sans-serif;
  margin-bottom: 2px;
}
.milestone-date {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
}
.milestone-sep {
  opacity: 0.5;
}
.milestone-months {
  font-size: 11px;
}
.milestone-balance {
  font-size: 11px;
  color: var(--muted);
  font-family: 'Inter', sans-serif;
}
</style>
