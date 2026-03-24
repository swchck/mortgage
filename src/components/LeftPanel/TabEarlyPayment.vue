<script setup lang="ts">
import { computed } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import TipIcon from '@/components/ui/TipIcon.vue';
import { X } from 'lucide-vue-next';

const store = useCalcStore();
const { t } = useI18n();

const validation = computed(() => store.getEPValidation());
</script>

<template>
  <div style="padding: 16px 18px 4px">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px">
      <span class="section-title" style="font-size: 15px">{{ t('earlyPayments.title') }}</span>
      <button class="btn-ghost" @click="store.addEP()">{{ t('earlyPayments.add') }}</button>
    </div>
    <p class="section-sub">
      {{ t('earlyPayments.desc') }} <TipIcon modal-key="earlyPayInfo" />
    </p>

    <div v-if="validation.globalWarn" class="ep-global-warn">{{ validation.globalWarn }}</div>

    <div v-if="!store.epList.length">
      <p style="font-size: 12px; color: var(--muted); text-align: center; padding: 16px 0">{{ t('earlyPayments.empty') }}</p>
    </div>

    <div v-for="ep in store.epList" :key="ep.id" style="background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin-bottom: 8px">
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 6px">
        <div class="ig" style="margin-bottom: 0">
          <label>{{ t('earlyPayments.fromMonth') }}</label>
          <input type="number" min="1" :value="ep.fromMonth" placeholder="1" style="height: 34px" @change="store.updateEP(ep.id, 'fromMonth', ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="ig" style="margin-bottom: 0">
          <label>{{ t('earlyPayments.toMonth') }}</label>
          <input type="number" min="1" :value="ep.toMonth" :placeholder="t('oneTime')" style="height: 34px" @change="store.updateEP(ep.id, 'toMonth', ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="ig" style="margin-bottom: 0">
          <label>{{ t('earlyPayments.type') }}</label>
          <select :value="ep.amountType" style="height: 34px; font-size: 11px; padding: 0 6px" @change="store.updateEP(ep.id, 'amountType', ($event.target as HTMLSelectElement).value)">
            <option value="fixed">{{ t('earlyPayments.amountTypes.fixed') }} {{ store.sym }}</option>
            <option value="pct">{{ t('earlyPayments.amountTypes.pct') }}</option>
          </select>
        </div>
      </div>
      <div style="display: flex; gap: 6px; align-items: flex-end; margin-bottom: 6px">
        <div class="ig" style="flex: 1; margin-bottom: 0">
          <label>{{ ep.amountType === 'pct' ? t('earlyPayments.amountPct') : t('earlyPayments.amount') + ' (' + store.sym + ')' }}</label>
          <input type="number" min="0" :value="ep.amount" :placeholder="ep.amountType === 'pct' ? '10' : '50000'" style="height: 34px" @change="store.updateEP(ep.id, 'amount', ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="ig" style="flex: 1; margin-bottom: 0">
          <label>{{ t('earlyPayments.goal') }}</label>
          <select :value="ep.type" style="height: 34px; font-size: 11px; padding: 0 6px" @change="store.updateEP(ep.id, 'type', ($event.target as HTMLSelectElement).value)">
            <option value="reduce_term">{{ t('earlyPayments.goals.reduce_term') }}</option>
            <option value="reduce_payment">{{ t('earlyPayments.goals.reduce_payment') }}</option>
          </select>
        </div>
        <button class="btn-del" style="flex-shrink: 0; margin-bottom: 0" @click="store.removeEP(ep.id)"><X :size="14" /></button>
      </div>
      <div
        v-if="validation.perEp.get(ep.id)"
        class="ep-warn-msg"
        :class="validation.perEp.get(ep.id)!.level === 'error' ? 'ep-warn-error' : 'ep-warn-warn'"
      >
        {{ validation.perEp.get(ep.id)!.msg }}
      </div>
    </div>
  </div>
</template>
