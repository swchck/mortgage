<script setup lang="ts">
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import { fmt, SYM } from '@/utils/format';
import { X } from 'lucide-vue-next';

const store = useCalcStore();
const { t, locale } = useI18n();

function costLabel(cost: { labelRu: string; labelEn: string; labelSr: string }) {
  if (locale.value === 'en') return cost.labelEn;
  if (locale.value === 'sr') return cost.labelSr;
  return cost.labelRu;
}
</script>

<template>
  <div style="padding: 16px 18px 4px">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 6px">
      <span class="section-title" style="font-size: 15px">{{ t('costs.title') }}</span>
      <div style="display: flex; gap: 4px">
        <button class="btn-ghost" @click="store.addCustomCost()">{{ t('costs.add') }}</button>
        <button class="btn-ghost" @click="store.resetCostsToDefaults()">{{ t('costs.reset') }}</button>
      </div>
    </div>
    <p class="section-sub">{{ t('costs.desc') }}</p>

    <!-- Costs currency -->
    <div class="ig">
      <label>{{ t('costs.currency') }}</label>
      <select v-model="store.costsCurrency">
        <option value="EUR">{{ t('currencies.EUR') }}</option>
        <option value="USD">{{ t('currencies.USD') }}</option>
        <option value="RUB">{{ t('currencies.RUB') }}</option>
        <option value="RSD">{{ t('currencies.RSD') }}</option>
      </select>
    </div>

    <div v-for="cost in store.acquisitionCosts" :key="cost.key" class="cost-row">
      <!-- Label -->
      <div v-if="cost.custom" class="cost-label">
        <input
          type="text"
          :value="costLabel(cost)"
          :placeholder="t('costs.customLabel')"
          style="height: 34px; font-size: 12px; font-family: 'Inter', sans-serif"
          @input="store.updateCostLabel(cost.key, ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div v-else class="cost-label" :title="costLabel(cost)">{{ costLabel(cost) }}</div>

      <!-- Type for custom -->
      <select
        v-if="cost.custom"
        :value="cost.type"
        style="width: 52px; height: 34px; font-size: 10px; padding: 0 4px; flex-shrink: 0"
        @change="store.updateCostType(cost.key, ($event.target as HTMLSelectElement).value as any)"
      >
        <option value="fixed">{{ SYM[store.costsCurrency] }}</option>
        <option value="pct">%</option>
      </select>

      <!-- Value -->
      <div class="input-suffix">
        <input
          type="number"
          :value="cost.value"
          :step="cost.type === 'pct' ? 0.1 : 10"
          min="0"
          @input="store.updateCost(cost.key, parseFloat(($event.target as HTMLInputElement).value) || 0)"
        />
        <span class="suffix">{{ cost.type === 'pct' ? '%' : SYM[store.costsCurrency] }}</span>
      </div>

      <!-- Delete any cost -->
      <button class="btn-del" @click="store.removeCost(cost.key)"><X :size="14" /></button>
    </div>

    <!-- Suggest restoring removed defaults -->
    <div v-if="store.availableDefaults.length > 0" style="margin-bottom: 10px">
      <div style="font-size: 10px; color: var(--muted); margin-bottom: 6px; font-family: 'Inter', sans-serif">
        {{ locale === 'ru' ? 'Добавить расходы:' : locale === 'sr' ? 'Dodaj troškove:' : 'Add costs:' }}
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 4px">
        <button
          v-if="store.availableDefaults.length > 1"
          class="btn-ghost"
          style="font-size: 10px; height: 24px; padding: 0 8px; font-weight: 600"
          @click="store.restoreAllDefaults()"
        >+ {{ locale === 'ru' ? 'Все' : locale === 'sr' ? 'Sve' : 'All' }}</button>
        <button
          v-for="d in store.availableDefaults"
          :key="d.key"
          class="btn-ghost"
          style="font-size: 10px; height: 24px; padding: 0 8px"
          @click="store.restoreDefault(d.key)"
        >+ {{ costLabel(d) }}</button>
      </div>
    </div>

    <hr />

    <div style="font-size: 12px; color: var(--muted); display: flex; flex-direction: column; gap: 4px; font-family: 'Inter', sans-serif">
      <div style="display: flex; justify-content: space-between">
        <span>{{ t('costs.fixed') }}:</span>
        <b style="color: var(--text)">{{ fmt(store.totalFixedCosts) }} {{ SYM[store.costsCurrency] }}</b>
      </div>
      <div v-if="Number(store.propPrice) > 0" style="display: flex; justify-content: space-between">
        <span>{{ t('costs.percent') }}:</span>
        <b style="color: var(--text)">{{ fmt(store.totalPctCosts) }} {{ SYM[store.costsCurrency] }}</b>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--gold); font-size: 13px; margin-top: 4px">
        <span>{{ t('costs.total') }}:</span>
        <span>{{ fmt(store.totalAcquisitionCosts) }} {{ SYM[store.costsCurrency] }}</span>
      </div>
    </div>
  </div>
</template>
