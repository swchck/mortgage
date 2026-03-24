<script setup lang="ts">
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import AppToggle from '@/components/ui/AppToggle.vue';
import TipIcon from '@/components/ui/TipIcon.vue';
import { Home } from 'lucide-vue-next';

const store = useCalcStore();
const { t } = useI18n();
</script>

<template>
  <div style="padding: 16px 18px 4px">
    <!-- Currency -->
    <div class="ig">
      <label for="currency-select">{{ t('currency') }}</label>
      <select id="currency-select" :value="store.currency" @change="store.setCurrency(($event.target as HTMLSelectElement).value as any)">
        <option value="RUB">{{ t('currencies.RUB') }}</option>
        <option value="EUR">{{ t('currencies.EUR') }}</option>
        <option value="USD">{{ t('currencies.USD') }}</option>
        <option value="RSD">{{ t('currencies.RSD') }}</option>
      </select>
    </div>

    <!-- Property -->
    <div style="background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 14px">
      <div style="font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; display: flex; align-items: center; gap: 5px">
        <Home :size="12" style="margin-right: 3px; opacity: .7" /> {{ t('property.title') }} <TipIcon modal-key="propInfo" />
      </div>
      <div class="prop-row">
        <div class="ig">
          <label>{{ t('property.price') }}</label>
          <div style="position: relative">
            <input
              type="number"
              :value="store.propPrice"
              placeholder="0"
              @input="store.propPrice = parseFloat(($event.target as HTMLInputElement).value) || ''; store.onPropChange()"
            />
            <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 11px; pointer-events: none">{{ store.sym }}</span>
          </div>
        </div>
        <div class="ig">
          <label>{{ t('property.downPayment') }} <span v-if="Number(store.propPrice) > 0" style="margin-left: 4px; color: var(--text); font-weight: 600">({{ store.dpPercent }}%)</span></label>
          <div style="position: relative">
            <input
              type="number"
              :value="store.downPayment"
              placeholder="0"
              @input="store.downPayment = parseFloat(($event.target as HTMLInputElement).value) || ''; store.onPropChange()"
            />
            <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 11px; pointer-events: none">{{ store.sym }}</span>
          </div>
        </div>
      </div>
      <div v-if="Number(store.propPrice) > 0" class="prop-derived">
        {{ t('property.loan') }}: <b>{{ store.fmt(store.loan) }} {{ store.sym }}</b>
        &nbsp;·&nbsp; {{ t('property.downPayment') }}: <b>{{ store.dpPercent }}%</b>
        <span v-if="Number(store.dpPercent) < 20" style="color: var(--red); font-size: 10px; margin-left: 6px">{{ t('property.pmi') }}</span>
      </div>
    </div>

    <!-- Monthly Rent (Rent vs Buy) -->
    <div class="ig">
      <label>{{ t('rentVsBuy.monthlyRent') }}</label>
      <div style="position: relative">
        <input
          type="number"
          :value="store.monthlyRent"
          placeholder="0"
          min="0"
          @input="store.monthlyRent = parseFloat(($event.target as HTMLInputElement).value) || ''"
        />
        <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 11px; pointer-events: none">{{ store.sym }}</span>
      </div>
    </div>

    <!-- Salary / Affordability -->
    <div class="ig">
      <label>{{ t('affordability.salary') }}</label>
      <div style="position: relative">
        <input
          type="number"
          :value="store.salary"
          placeholder="0"
          min="0"
          @input="store.salary = parseFloat(($event.target as HTMLInputElement).value) || ''"
        />
        <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 11px; pointer-events: none">{{ store.sym }}</span>
      </div>
      <div v-if="Number(store.salary) > 0 && store.calculated" style="margin-top: 4px; font-size: 11px; display: flex; align-items: center; gap: 6px">
        <span
          style="display: inline-block; width: 8px; height: 8px; border-radius: 50%"
          :style="{ background: store.isAffordable ? 'var(--green)' : 'var(--red)' }"
        />
        <span :style="{ color: store.isAffordable ? 'var(--green)' : 'var(--red)' }">
          {{ store.isAffordable ? t('affordability.affordable') : t('affordability.notAffordable') }}
        </span>
      </div>
      <div v-if="Number(store.salary) > 0" style="margin-top: 4px; font-size: 11px; color: var(--muted)">
        {{ t('affordability.maxLoan') }}: <b style="color: var(--text)">{{ store.fmt(Math.round(store.maxAffordableLoan)) }} {{ store.sym }}</b>
      </div>
    </div>

    <!-- Loan -->
    <div class="ig">
      <label for="loan-amount">{{ t('loanAmount') }} <TipIcon modal-key="loanInfo" /></label>
      <div style="position: relative">
        <input id="loan-amount" v-model.number="store.loan" type="number" min="0" step="10000" />
        <span style="position: absolute; right: 9px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 11px; pointer-events: none">{{ store.sym }}</span>
      </div>
    </div>

    <!-- Term -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">
      <div class="ig">
        <label for="term-years">{{ t('termYears') }}</label>
        <input id="term-years" v-model.number="store.termYears" type="number" min="1" max="50" />
      </div>
      <div class="ig">
        <label for="term-months">{{ t('termMonths') }}</label>
        <input id="term-months" v-model.number="store.termMonths" type="number" min="0" max="11" />
      </div>
    </div>
    <div class="ig">
      <label for="start-date">{{ t('startDate') }}</label>
      <input id="start-date" v-model="store.startDate" type="date" />
    </div>

    <hr />

    <!-- Rate type -->
    <div class="ig">
      <label>{{ t('rateType') }} <TipIcon modal-key="rateTypeInfo" /></label>
      <AppToggle
        :model-value="store.rateType"
        :options="[
          { value: 'fixed', label: t('rateTypes.fixed') },
          { value: 'index', label: t('rateTypes.index') },
        ]"
        @update:model-value="store.setRateType($event as any)"
      />
    </div>

    <!-- Fixed rate -->
    <div v-if="store.rateType === 'fixed'">
      <div class="ig">
        <label>{{ t('fixedRate') }} <TipIcon modal-key="fixedRateInfo" /></label>
        <input v-model.number="store.fixedRate" type="number" min="0" max="50" step="0.01" />
      </div>
    </div>

    <!-- Index rate -->
    <div v-if="store.rateType === 'index'">
      <div class="ig">
        <label for="index-type">
          {{ t('indexLabel') }} <TipIcon modal-key="indexInfo" />
          <span class="rate-status" :class="store.indexStatus">
            <span class="dot" />
            {{ store.indexStatus === 'live' ? 'live' : store.indexStatus === 'stale' ? t('offline') : t('loading') }}
          </span>
        </label>
        <select id="index-type" :value="store.indexType" @change="store.indexType = ($event.target as HTMLSelectElement).value as any; store.onIndexTypeChange()">
          <option value="euribor3m">EURIBOR 3M</option>
          <option value="euribor6m">EURIBOR 6M</option>
          <option value="euribor12m">EURIBOR 12M</option>
          <option value="sofr">SOFR</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">
        <div class="ig">
          <label for="index-rate">{{ t('indexRate') }} <TipIcon modal-key="indexRateInfo" /></label>
          <input id="index-rate" v-model.number="store.indexRate" type="number" min="-5" max="20" step="0.01" />
        </div>
        <div class="ig">
          <label for="spread-rate">{{ t('spreadLabel') }} <TipIcon modal-key="spreadInfo" /></label>
          <input id="spread-rate" v-model.number="store.spread" type="number" min="0" max="20" step="0.01" />
        </div>
      </div>
      <div class="rate-pill">{{ store.totalRate.toFixed(2) }}%</div>
      <p class="inline-rate-label">{{ t('totalRateLabel') }}</p>
    </div>

    <hr />

    <!-- Pay type -->
    <div class="ig" style="margin-bottom: 4px">
      <label>{{ t('payType') }} <TipIcon modal-key="payTypeInfo" /></label>
      <AppToggle
        :model-value="store.payType"
        :options="[
          { value: 'annuity', label: t('payTypes.annuity') },
          { value: 'diff', label: t('payTypes.diff') },
        ]"
        @update:model-value="store.setPayType($event as any)"
      />
    </div>
  </div>
</template>
