<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import { Chart, registerables } from 'chart.js';
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import { SYM, fmtM } from '@/utils/format';
import type { ScheduleRow } from '@/types';
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue';

Chart.register(...registerables);

const store = useCalcStore();
const { t, te } = useI18n();

const canvas = ref<HTMLCanvasElement | null>(null);
const chartBox = ref<HTMLDivElement | null>(null);
const activeChart = shallowRef<Chart | null>(null);
let resizeObs: ResizeObserver | null = null;

function getVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function alpha(cssColor: string, a: number): string {
  // Handle both hex (#60a5fa) and rgb(r,g,b) formats
  if (cssColor.startsWith('#')) {
    const hex = cssColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  const m = cssColor.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${a})`;
  return cssColor;
}

function CC() {
  return {
    grid: getVar('--chart-grid') || 'rgba(30,46,77,.5)',
    tick: getVar('--muted') || '#8899aa',
    tip: {
      bg: getVar('--surface') || '#0d1629',
      border: getVar('--border') || '#1e2e4d',
      title: getVar('--text') || '#e2e8f0',
      body: getVar('--muted') || '#8899aa',
    },
    legend: getVar('--muted') || '#8899aa',
    blue: getVar('--blue') || '#60a5fa',
    gold: getVar('--gold') || '#f0b429',
    green: getVar('--green') || '#34d399',
    red: getVar('--red') || '#f87171',
  };
}

function chartOpts(C: ReturnType<typeof CC>, sym: string, extra: Record<string, unknown>) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: C.legend, font: { family: 'Inter', size: 11 }, boxWidth: 10, padding: 10 },
      },
      tooltip: {
        backgroundColor: C.tip.bg,
        borderColor: C.tip.border,
        borderWidth: 1,
        titleColor: C.tip.title,
        bodyColor: C.tip.body,
        padding: 10,
        callbacks: {
          label: (c: { dataset: { label: string }; parsed: { y: number } }) =>
            ' ' + c.dataset.label + ': ' + new Intl.NumberFormat('ru-RU').format(c.parsed.y) + ' ' + sym,
        },
      },
    },
    scales: {
      x: {
        ...(extra.x || {}),
        ticks: { color: C.tick, font: { family: 'IBM Plex Mono', size: 9 }, maxTicksLimit: 10, maxRotation: 45 },
        grid: { color: C.grid },
      },
      y: {
        ...(extra.y || {}),
        ticks: {
          color: C.tick,
          font: { family: 'IBM Plex Mono', size: 9 },
          callback: (v: number) => new Intl.NumberFormat('ru-RU', { notation: 'compact' as const }).format(v),
        },
        grid: { color: C.grid },
      },
      ...(extra.y1
        ? {
            y1: {
              position: 'right' as const,
              ticks: {
                color: C.tick,
                font: { family: 'IBM Plex Mono', size: 9 },
                callback: (v: number) => new Intl.NumberFormat('ru-RU', { notation: 'compact' as const }).format(v),
              },
              grid: { drawOnChartArea: false },
            },
          }
        : {}),
    },
  };
}

function renderChart() {
  if (!canvas.value) return;
  const rows = store.activeSchedule;
  if (!rows.length) return;
  const ctx = canvas.value.getContext('2d');
  if (!ctx) return;
  if (activeChart.value) {
    activeChart.value.destroy();
    activeChart.value = null;
  }
  const C = CC();
  const sym = SYM[store.currency];

  let data = rows;
  if (store.timeRange > 0) data = rows.slice(0, store.timeRange);
  const step = data.length <= 60 ? 1 : data.length <= 180 ? 2 : Math.ceil(data.length / 120);
  const s = data.filter((_: ScheduleRow, i: number) => i % step === 0 || i === data.length - 1);

  if (store.chartType === 'payments') {
    activeChart.value = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: s.map((r: ScheduleRow) => r.date),
        datasets: [
          { label: t('charts.labels.principal'), data: s.map((r: ScheduleRow) => Math.round(r.principal)), backgroundColor: alpha(C.blue,.75), stack: 'p', order: 2 },
          { label: t('charts.labels.interest'), data: s.map((r: ScheduleRow) => Math.round(r.interest)), backgroundColor: alpha(C.gold,.75), stack: 'p', order: 2 },
          { label: t('charts.labels.early'), data: s.map((r: ScheduleRow) => Math.round(r.earlyAmt)), backgroundColor: alpha(C.green,.85), stack: 'p', order: 2 },
          { label: t('charts.labels.balance'), data: s.map((r: ScheduleRow) => Math.round(r.balance)), type: 'line', borderColor: alpha(C.red,.8), backgroundColor: alpha(C.red,.05), borderWidth: 2, pointRadius: 0, fill: false, yAxisID: 'y1', order: 1 },
        ],
      },
      options: chartOpts(C, sym, { x: { stacked: true }, y: { stacked: true, title: { display: true, text: t('charts.labels.payment'), color: C.tick, font: { size: 10 } } }, y1: true }) as any,
    });
  } else if (store.chartType === 'balance') {
    let cumInt = 0;
    const cumData = data.map((r: ScheduleRow) => {
      cumInt += r.interest;
      return { date: r.date, bal: Math.round(r.balance), cumInt: Math.round(cumInt) };
    });
    const ss = cumData.filter((_: { date: string; bal: number; cumInt: number }, i: number) => i % step === 0 || i === cumData.length - 1);
    activeChart.value = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ss.map((r: { date: string; bal: number; cumInt: number }) => r.date),
        datasets: [
          { label: t('charts.labels.balance'), data: ss.map((r: { date: string; bal: number; cumInt: number }) => r.bal), borderColor: alpha(C.blue,.9), backgroundColor: alpha(C.blue,.08), borderWidth: 2, pointRadius: 0, fill: true },
          { label: t('charts.labels.cumInterest'), data: ss.map((r: { date: string; bal: number; cumInt: number }) => r.cumInt), borderColor: alpha(C.gold,.9), backgroundColor: alpha(C.gold,.06), borderWidth: 2, pointRadius: 0, fill: true },
        ],
      },
      options: chartOpts(C, sym, {}) as any,
    });
  } else if (store.chartType === 'structure') {
    const totP = rows.reduce((a: number, r: ScheduleRow) => a + r.principal, 0);
    const totI = rows.reduce((a: number, r: ScheduleRow) => a + r.interest, 0);
    const totE = rows.reduce((a: number, r: ScheduleRow) => a + r.earlyAmt, 0);
    const labels = [t('charts.labels.principal'), t('charts.labels.interest')];
    const dData = [Math.round(totP), Math.round(totI)];
    const colors = [alpha(C.blue,.8), alpha(C.gold,.8)];
    if (totE > 0) {
      labels.push(t('charts.labels.early'));
      dData.push(Math.round(totE));
      colors.push(alpha(C.green,.8));
    }
    const total = totP + totI + totE;
    activeChart.value = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: dData, backgroundColor: colors, borderWidth: 0 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: C.legend, font: { family: 'Inter', size: 11 }, padding: 14 } },
          tooltip: {
            backgroundColor: C.tip.bg,
            borderColor: C.tip.border,
            borderWidth: 1,
            titleColor: C.tip.title,
            bodyColor: C.tip.body,
            padding: 10,
            callbacks: {
              label: (c: any) => ' ' + c.label + ': ' + fmtM(c.parsed, sym) + ' (' + ((c.parsed / total) * 100).toFixed(1) + '%)',
            },
          },
        },
      } as any,
    });
    return;
  } else if (store.chartType === 'rate') {
    // Rate over time chart
    activeChart.value = new Chart(ctx, {
      type: 'line',
      data: {
        labels: s.map((r: ScheduleRow) => r.date),
        datasets: [
          { label: t('charts.labels.annualRate'), data: s.map((r: ScheduleRow) => r.annRate), borderColor: alpha(C.gold,.9), backgroundColor: alpha(C.gold,.08), borderWidth: 2, pointRadius: 0, fill: true },
        ],
      },
      options: chartOpts(C, '%', {}) as any,
    });
  } else if (store.chartType === 'annual') {
    const byYear: Record<string, { p: number; i: number; e: number }> = {};
    data.forEach((r: ScheduleRow) => {
      const y = r.date.slice(6);
      if (!byYear[y]) byYear[y] = { p: 0, i: 0, e: 0 };
      byYear[y].p += r.principal;
      byYear[y].i += r.interest;
      byYear[y].e += r.earlyAmt;
    });
    const yrs = Object.keys(byYear);
    activeChart.value = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: yrs,
        datasets: [
          { label: t('charts.labels.principal'), data: yrs.map((y) => Math.round(byYear[y].p)), backgroundColor: alpha(C.blue,.75), stack: 'y' },
          { label: t('charts.labels.interest'), data: yrs.map((y) => Math.round(byYear[y].i)), backgroundColor: alpha(C.gold,.75), stack: 'y' },
          { label: t('charts.labels.early'), data: yrs.map((y) => Math.round(byYear[y].e)), backgroundColor: alpha(C.green,.8), stack: 'y' },
        ],
      },
      options: chartOpts(C, sym, { x: { stacked: true }, y: { stacked: true } }) as any,
    });
  } else if (store.chartType === 'interestPrincipal') {
    // Interest vs principal ratio per month
    activeChart.value = new Chart(ctx, {
      type: 'line',
      data: {
        labels: s.map((r: ScheduleRow) => r.date),
        datasets: [
          { label: t('charts.labels.principal'), data: s.map((r: ScheduleRow) => Math.round(r.principal)), borderColor: alpha(C.blue, .9), backgroundColor: alpha(C.blue, .15), borderWidth: 2, pointRadius: 0, fill: true },
          { label: t('charts.labels.interest'), data: s.map((r: ScheduleRow) => Math.round(r.interest)), borderColor: alpha(C.gold, .9), backgroundColor: alpha(C.gold, .15), borderWidth: 2, pointRadius: 0, fill: true },
        ],
      },
      options: chartOpts(C, sym, {}) as any,
    });
  } else if (store.chartType === 'cumulative') {
    // Cumulative total paid vs principal repaid
    let cumPaid = 0;
    let cumPrinc = 0;
    const cumData = data.map((r: ScheduleRow) => {
      cumPaid += r.payment + r.earlyAmt;
      cumPrinc += r.principal + r.earlyAmt;
      return { date: r.date, paid: Math.round(cumPaid), princ: Math.round(cumPrinc) };
    });
    const cs = cumData.filter((_: { date: string; paid: number; princ: number }, i: number) => i % step === 0 || i === cumData.length - 1);
    activeChart.value = new Chart(ctx, {
      type: 'line',
      data: {
        labels: cs.map((r: { date: string; paid: number; princ: number }) => r.date),
        datasets: [
          { label: t('charts.labels.payment'), data: cs.map((r: { date: string; paid: number; princ: number }) => r.paid), borderColor: alpha(C.red, .9), backgroundColor: alpha(C.red, .08), borderWidth: 2, pointRadius: 0, fill: true },
          { label: t('charts.labels.principal'), data: cs.map((r: { date: string; paid: number; princ: number }) => r.princ), borderColor: alpha(C.blue, .9), backgroundColor: alpha(C.blue, .08), borderWidth: 2, pointRadius: 0, fill: true },
        ],
      },
      options: chartOpts(C, sym, {}) as any,
    });
  }
}

watch(
  () => [store.activeSchedule, store.chartType, store.timeRange],
  () => renderChart(),
  { deep: true },
);

// Theme/scheme changes need a frame delay for CSS vars to update
watch(
  () => store.theme,
  () => requestAnimationFrame(() => renderChart()),
);

// Also watch for scheme changes via MutationObserver
let schemeObs: MutationObserver | null = null;

onMounted(() => {
  if (chartBox.value && window.ResizeObserver) {
    resizeObs = new ResizeObserver(() => {
      if (activeChart.value) activeChart.value.resize();
    });
    resizeObs.observe(chartBox.value);
  }
  // Watch for data-scheme attribute changes to redraw chart
  schemeObs = new MutationObserver(() => {
    requestAnimationFrame(() => renderChart());
  });
  schemeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme', 'data-theme'] });
  renderChart();
});

onBeforeUnmount(() => {
  if (resizeObs) resizeObs.disconnect();
  if (schemeObs) schemeObs.disconnect();
  if (activeChart.value) activeChart.value.destroy();
});
</script>

<template>
  <CollapsibleCard>
    <template #header>
      <span class="section-title">{{ t('charts.title') }}</span>
    </template>
    <div class="chart-tabs">
      <button
        v-for="ct in (['payments', 'balance', 'structure', 'annual', 'rate', 'interestPrincipal', 'cumulative'] as const)"
        :key="ct"
        class="chart-tab"
        :class="{ active: store.chartType === ct }"
        @click="store.chartType = ct"
      >
        {{ t('charts.types.' + ct) }}
      </button>
    </div>
    <div v-show="store.chartType !== 'structure'" class="chart-time">
      <button
        v-for="tr in [{ n: 0, l: t('charts.timeRanges.all') }, { n: 12, l: t('charts.timeRanges.y1') }, { n: 60, l: t('charts.timeRanges.y5') }, { n: 120, l: t('charts.timeRanges.y10') }]"
        :key="tr.n"
        class="chart-time-btn"
        :class="{ active: store.timeRange === tr.n }"
        @click="store.timeRange = tr.n"
      >
        {{ tr.l }}
      </button>
    </div>
    <div ref="chartBox" class="chart-box">
      <canvas ref="canvas" />
    </div>
    <div v-if="te('charts.descs.' + store.chartType)" class="chart-desc">{{ t('charts.descs.' + store.chartType) }}</div>
  </CollapsibleCard>
</template>
