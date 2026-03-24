<script setup lang="ts">
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import TipIcon from '@/components/ui/TipIcon.vue';
import { X } from 'lucide-vue-next';

const store = useCalcStore();
const { t } = useI18n();
</script>

<template>
  <div style="padding: 16px 18px 4px">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px">
      <span class="section-title" style="font-size: 15px">{{ t('indexChanges.title') }}</span>
      <button class="btn-ghost" @click="store.addIC()">{{ t('indexChanges.add') }}</button>
    </div>
    <p class="section-sub">
      {{ t('indexChanges.desc') }} <TipIcon modal-key="indexChangeInfo" />
    </p>

    <div v-if="!store.icList.length">
      <p style="font-size: 12px; color: var(--muted); text-align: center; padding: 14px 0">{{ t('indexChanges.empty') }}</p>
    </div>

    <div v-for="ic in store.icList" :key="ic.id" class="ic-entry">
      <div class="ig" style="width: 72px; flex-shrink: 0; margin-bottom: 0">
        <label>{{ t('indexChanges.fromMonth') }}</label>
        <input type="number" min="1" :value="ic.month" placeholder="25" style="height: 34px" @change="store.updateIC(ic.id, 'month', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="ig" style="flex: 1; margin-bottom: 0">
        <label>{{ t('indexChanges.newRate') }}</label>
        <input type="number" step="0.01" :value="ic.newRate" placeholder="4.50" style="height: 34px" @change="store.updateIC(ic.id, 'newRate', ($event.target as HTMLInputElement).value)" />
      </div>
      <button class="btn-del" @click="store.removeIC(ic.id)"><X :size="14" /></button>
    </div>
  </div>
</template>
