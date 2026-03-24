<script setup lang="ts">
import { ref } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import TabParams from './TabParams.vue';
import TabEarlyPayment from './TabEarlyPayment.vue';
import TabIndex from './TabIndex.vue';
import TabCosts from './TabCosts.vue';

const store = useCalcStore();
const { t } = useI18n();

const activeTab = ref<'params' | 'early' | 'index' | 'costs'>('params');
const tabs = ['params', 'early', 'index', 'costs'] as const;
</script>

<template>
  <div class="left-panel">
    <div class="card">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="tab"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ t('tabs.' + tab) }}
        </button>
      </div>

      <div class="tab-content">
        <TabParams v-show="activeTab === 'params'" />
        <TabEarlyPayment v-show="activeTab === 'early'" />
        <TabIndex v-show="activeTab === 'index'" />
        <TabCosts v-show="activeTab === 'costs'" />
      </div>

      <div class="sticky-calc">
        <button class="btn-primary" @click="store.calculate()">{{ t('calculate') }}</button>
        <button
          v-if="store.calculated"
          class="btn-secondary"
          style="margin-top:6px"
          @click="store.scenarioA ? store.clearScenario() : store.saveScenario()"
        >
          {{ store.scenarioA ? t('scenario.clear') : t('scenario.save') }}
        </button>
      </div>
    </div>
  </div>
</template>
