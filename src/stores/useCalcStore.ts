import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type {
  Currency,
  RateType,
  PayType,
  IndexType,
  ChartType,
  EarlyPayment,
  IndexChange,
  ScheduleRow,
  FxRates,
  LiveRates,
  AcquisitionCost,
  CalcParams,
  ScenarioSnapshot,
} from '@/types';
import { buildSchedule, computePSK, annuityPmt, simExtra, maxLoanFromPayment, rentVsBuyBreakeven } from '@/utils/calc';
import { validateEPs } from '@/utils/validate';
import { SYM, fmt, fmtM } from '@/utils/format';
import { fetchFxRates, cvt } from '@/services/fx';
import { fetchLiveRates } from '@/services/rates';
import { fetchSerbiaInflation } from '@/services/inflation';
import { encodeShareUrl, decodeShareUrl } from '@/utils/share';

const INDEX_DEF: Record<string, number> = {
  euribor3m: 2.65,
  euribor6m: 2.8,
  euribor12m: 2.95,
  sofr: 5.3,
  custom: 3.5,
};

const DEFAULT_COSTS: AcquisitionCost[] = [
  // Документы и подготовка
  { key: 'miscDocs', labelRu: 'Разное (переводы, копии, выписки)', labelEn: 'Misc (translations, copies, extracts)', labelSr: 'Razno (prevodi, kopije, izvodi)', type: 'fixed', defaultValue: 100, value: 100 },
  { key: 'cadastreExtract', labelRu: 'Выписка из кадастра', labelEn: 'Cadastre extract', labelSr: 'Izvod iz katastra', type: 'fixed', defaultValue: 11, value: 11 },
  // Предварительный договор
  { key: 'notaryPreContract', labelRu: 'Нотариус, предварительный договор (~40 000 дин.)', labelEn: 'Notary, preliminary contract (~40,000 RSD)', labelSr: 'Notar, overa predugovora (~40.000 din.)', type: 'fixed', defaultValue: 342, value: 342 },
  { key: 'translatorPreContract', labelRu: 'Переводчик, предварительный договор', labelEn: 'Translator, preliminary contract', labelSr: 'Prevodilac, predugovor', type: 'fixed', defaultValue: 100, value: 100 },
  // Основной договор
  { key: 'notaryContract', labelRu: 'Нотариус, основной договор (~40 000 дин.)', labelEn: 'Notary, main contract (~40,000 RSD)', labelSr: 'Notar, overa ugovora (~40.000 din.)', type: 'fixed', defaultValue: 342, value: 342 },
  { key: 'translatorContract', labelRu: 'Переводчик, основной договор', labelEn: 'Translator, main contract', labelSr: 'Prevodilac, glavni ugovor', type: 'fixed', defaultValue: 100, value: 100 },
  // Залог и кадастр
  { key: 'notaryPledge', labelRu: 'Нотариус, залоговое заявление (65 000 дин.)', labelEn: 'Notary, pledge statement (65,000 RSD)', labelSr: 'Notar, založna izjava (65.000 din.)', type: 'fixed', defaultValue: 556, value: 556 },
  { key: 'cadastreEncumbrance', labelRu: 'Такса, обременение в кадастр (73 000 дин.)', labelEn: 'Fee, cadastre encumbrance (73,000 RSD)', labelSr: 'Taksa, upis tereta u katastar (73.000 din.)', type: 'fixed', defaultValue: 624, value: 624 },
  { key: 'notaryIntabulation', labelRu: 'Нотариус, клаузула интабуланди (5 200 дин.)', labelEn: 'Notary, intabulation clause (5,200 RSD)', labelSr: 'Notar, klauzula intabulandi (5.200 din.)', type: 'fixed', defaultValue: 44, value: 44 },
  { key: 'cadastreRegistration', labelRu: 'Регистрация в кадастре (6 220 дин.)', labelEn: 'Cadastre registration (6,220 RSD)', labelSr: 'Registracija u katastru (6.220 din.)', type: 'fixed', defaultValue: 53, value: 53 },
  // Банк и прочее
  { key: 'promissoryNotes', labelRu: 'Векселя в пользу банка (200 дин.)', labelEn: 'Promissory notes for bank (200 RSD)', labelSr: 'Menice u korist banke (200 din.)', type: 'fixed', defaultValue: 2, value: 2 },
  { key: 'bankCommission', labelRu: 'Комиссии банка', labelEn: 'Bank commissions', labelSr: 'Provizije banke', type: 'fixed', defaultValue: 100, value: 100 },
  { key: 'insurance', labelRu: 'Страховка квартиры (ежегодно)', labelEn: 'Apartment insurance (annually)', labelSr: 'Osiguranje stana (godišnje)', type: 'fixed', defaultValue: 40, value: 40 },
  { key: 'currencyDiff', labelRu: 'Курсовые разницы', labelEn: 'Currency exchange differences', labelSr: 'Kursne razlike', type: 'fixed', defaultValue: 250, value: 250 },
  // Комиссии и налоги
  { key: 'agentCommission', labelRu: 'Комиссия агентства (мин. 2 000 €)', labelEn: 'Agency commission (min. €2,000)', labelSr: 'Agencijska provizija (min. 2.000 €)', type: 'pct', defaultValue: 2.0, value: 2.0 },
  { key: 'transferTax', labelRu: 'Налог на перенос абс. прав (от физ. лица)', labelEn: 'Property transfer tax (from individuals)', labelSr: 'Porez na prenos aps. prava (od fiz. lica)', type: 'pct', defaultValue: 2.5, value: 2.5 },
];

export const useCalcStore = defineStore('calc', () => {
  // ── State ──
  const currency = ref<Currency>('EUR');
  const propPrice = ref<number | ''>('');
  const downPayment = ref<number | ''>('');
  const loan = ref(100_000);
  const termYears = ref(20);
  const termMonths = ref(0);
  const startDate = ref('');
  const rateType = ref<RateType>('fixed');
  const fixedRate = ref(9.5);
  const indexType = ref<IndexType>('euribor3m');
  const indexRate = ref(3.5);
  const spread = ref(2.5);
  const payType = ref<PayType>('annuity');

  const epList = ref<EarlyPayment[]>([]);
  const icList = ref<IndexChange[]>([]);
  let epCounter = 0;
  let icCounter = 0;
  let costCounter = 100;

  const scheduleAnn = ref<ScheduleRow[]>([]);
  const scheduleDif = ref<ScheduleRow[]>([]);
  const calculated = ref(false);

  const chartType = ref<ChartType>('payments');
  const chartPayType = ref<PayType>('annuity');
  const timeRange = ref(0);

  const fxRates = ref<FxRates>({ EUR: 1, USD: 1.08, RUB: 100, RSD: 117 });
  const liveRates = ref<LiveRates>({});
  const indexStatus = ref<'loading' | 'live' | 'stale'>('loading');

  const theme = ref<'dark' | 'light'>('dark');

  const salary = ref<number | ''>(0);
  const monthlyRent = ref<number | ''>(0);

  const acquisitionCosts = ref<AcquisitionCost[]>([]);
  const removedDefaultKeys = ref<string[]>(DEFAULT_COSTS.map((c) => c.key));
  const costsCurrency = ref<Currency>('EUR');

  const inflationRate = ref(3);
  const inflationStatus = ref<'loading' | 'live' | 'stale'>('loading');

  const scenarioA = ref<ScenarioSnapshot | null>(null);

  // ── Getters ──
  const termMo = computed(() => termYears.value * 12 + termMonths.value);
  const totalRate = computed(() => indexRate.value + spread.value);

  const activeSchedule = computed(() =>
    payType.value === 'annuity' ? scheduleAnn.value : scheduleDif.value,
  );

  const chartSchedule = computed(() =>
    chartPayType.value === 'annuity' ? scheduleAnn.value : scheduleDif.value,
  );

  const dpPercent = computed(() => {
    const p = Number(propPrice.value) || 0;
    const d = Number(downPayment.value) || 0;
    return p > 0 ? ((d / p) * 100).toFixed(1) : '0.0';
  });

  const sym = computed(() => SYM[currency.value]);
  const costsSym = computed(() => SYM[costsCurrency.value]);

  const totalFixedCosts = computed(() =>
    acquisitionCosts.value
      .filter((c) => c.type === 'fixed')
      .reduce((sum, c) => sum + c.value, 0),
  );

  const totalPctCosts = computed(() => {
    // pct costs apply to property price in the main currency, convert to costs currency
    const p = Number(propPrice.value) || 0;
    if (p <= 0) return 0;
    // Convert propPrice from main currency to costs currency
    const priceInCostsCur = cvt(p, currency.value, costsCurrency.value, fxRates.value);
    return acquisitionCosts.value
      .filter((c) => c.type === 'pct')
      .reduce((sum, c) => sum + (priceInCostsCur * c.value) / 100, 0);
  });

  const totalAcquisitionCosts = computed(() => totalFixedCosts.value + totalPctCosts.value);

  // Total acquisition costs in the main mortgage currency
  const totalAcquisitionCostsInMainCurrency = computed(() =>
    cvt(totalAcquisitionCosts.value, costsCurrency.value, currency.value, fxRates.value),
  );

  const maxAffordableLoan = computed(() => {
    const s = Number(salary.value) || 0;
    if (s <= 0) return 0;
    const maxPmt = s * 0.5;
    const mRate =
      (rateType.value === 'fixed' ? fixedRate.value : indexRate.value + spread.value) / 1200;
    return maxLoanFromPayment(maxPmt, termMo.value, mRate);
  });

  const isAffordable = computed(() => {
    const s = Number(salary.value) || 0;
    if (s <= 0) return true;
    const rows = activeSchedule.value;
    if (!rows.length) return true;
    return rows[0].payment <= s * 0.5;
  });

  const stressTestResults = computed(() => {
    if (!calculated.value || !loan.value || !termMo.value) return [];
    const annRate =
      rateType.value === 'fixed' ? fixedRate.value : indexRate.value + spread.value;
    const mRate = annRate / 1200;
    const basePmt = annuityPmt(loan.value, termMo.value, mRate);
    return [1, 2, 3].map((delta) => {
      const newRate = annRate + delta;
      const newMRate = newRate / 1200;
      const newPmt = annuityPmt(loan.value, termMo.value, newMRate);
      const pmtIncrease = newPmt - basePmt;
      const pmtIncreasePct = basePmt > 0 ? (pmtIncrease / basePmt) * 100 : 0;
      const totalExtra = pmtIncrease * termMo.value;
      return { delta, newRate, newPmt, pmtIncrease, pmtIncreasePct, totalExtra };
    });
  });

  const rentVsBuyAnalysis = computed(() => {
    const rent = Number(monthlyRent.value) || 0;
    if (!calculated.value || rent <= 0 || !activeSchedule.value.length) return null;
    const dp = Number(downPayment.value) || 0;
    const acqCosts = totalAcquisitionCostsInMainCurrency.value;
    return rentVsBuyBreakeven(activeSchedule.value, rent, acqCosts, dp);
  });

  function buildCurrentSnapshot(label: string): ScenarioSnapshot | null {
    const rows = activeSchedule.value;
    if (!rows.length) return null;
    const totalPay = rows.reduce((s, r) => s + r.payment + r.earlyAmt, 0);
    const totalInt = rows.reduce((s, r) => s + r.interest, 0);
    const annRate = rateType.value === 'fixed' ? fixedRate.value : indexRate.value + spread.value;
    return {
      label,
      currency: currency.value,
      loan: loan.value,
      termMo: termMo.value,
      rate: annRate,
      payType: payType.value,
      monthlyPayment: rows[0].payment,
      totalPayments: totalPay,
      totalInterest: totalInt,
      overpayment: totalPay - loan.value,
      actualTermMo: rows.length,
    };
  }

  function saveScenario() {
    const snap = buildCurrentSnapshot('A');
    if (snap) scenarioA.value = snap;
  }

  function clearScenario() {
    scenarioA.value = null;
  }

  const scenarioB = computed<ScenarioSnapshot | null>(() => {
    if (!scenarioA.value || !calculated.value) return null;
    return buildCurrentSnapshot('B');
  });

  // ── Params builder ──
  function readParams(): CalcParams {
    return {
      loan: loan.value,
      termMo: termMo.value,
      startDate: startDate.value,
      rateType: rateType.value,
      fixedRate: fixedRate.value,
      indexRate: indexRate.value,
      spread: spread.value,
      eps: epList.value.filter(
        (e) => (e.fromMonth as number) > 0 && (e.amount as number) > 0,
      ),
      ics: icList.value
        .filter((e) => (e.month as number) > 0 && e.newRate !== '')
        .sort((a, b) => (a.month as number) - (b.month as number)),
      currency: currency.value,
    };
  }

  // ── Actions ──
  function calculate() {
    const p = readParams();
    if (!p.loan || !p.termMo) return;
    scheduleAnn.value = buildSchedule(p, 'annuity');
    scheduleDif.value = buildSchedule(p, 'diff');
    calculated.value = true;
  }

  let _debTimer: ReturnType<typeof setTimeout> | null = null;
  function autoCalc() {
    if (_debTimer) clearTimeout(_debTimer);
    _debTimer = setTimeout(() => {
      if (calculated.value) calculate();
    }, 600);
  }

  function setCurrency(nc: Currency) {
    const prev = currency.value;
    if (nc === prev) return;
    const rates = fxRates.value;
    if (loan.value > 0) loan.value = Math.round(cvt(loan.value, prev, nc, rates));
    if (Number(propPrice.value) > 0)
      propPrice.value = Math.round(cvt(Number(propPrice.value), prev, nc, rates));
    if (Number(downPayment.value) > 0)
      downPayment.value = Math.round(cvt(Number(downPayment.value), prev, nc, rates));
    currency.value = nc;
    if (calculated.value) calculate();
  }

  function onPropChange() {
    const p = Number(propPrice.value) || 0;
    const d = Number(downPayment.value) || 0;
    if (p > 0) {
      loan.value = Math.max(0, p - d);
    }
  }

  function setRateType(t: RateType) {
    rateType.value = t;
    autoCalc();
  }

  function setPayType(t: PayType) {
    payType.value = t;
    autoCalc();
  }

  function onIndexTypeChange() {
    const t = indexType.value;
    const live = liveRates.value[t as keyof LiveRates];
    indexRate.value = live != null ? live : INDEX_DEF[t] || 3.5;
    autoCalc();
  }

  function applyLiveRate() {
    const t = indexType.value;
    const live = liveRates.value[t as keyof LiveRates];
    if (live != null) indexRate.value = live;
  }

  // EP CRUD
  function addEP() {
    epList.value.push({
      id: ++epCounter,
      fromMonth: '',
      toMonth: '',
      amountType: 'fixed',
      amount: '',
      type: 'reduce_payment',
    });
  }

  function removeEP(id: number) {
    epList.value = epList.value.filter((e) => e.id !== id);
    autoCalc();
  }

  function updateEP(id: number, field: string, value: string | number) {
    const e = epList.value.find((x) => x.id === id);
    if (!e) return;
    if (field === 'type' || field === 'amountType') {
      (e as Record<string, unknown>)[field] = value;
    } else {
      (e as Record<string, unknown>)[field] = parseFloat(String(value)) || '';
    }
    autoCalc();
  }

  // IC CRUD
  function addIC() {
    icList.value.push({ id: ++icCounter, month: '', newRate: '' });
  }

  function removeIC(id: number) {
    icList.value = icList.value.filter((e) => e.id !== id);
    autoCalc();
  }

  function updateIC(id: number, field: string, value: string | number) {
    const e = icList.value.find((x) => x.id === id);
    if (e) {
      (e as Record<string, unknown>)[field] = parseFloat(String(value)) || '';
      autoCalc();
    }
  }

  // Costs
  function updateCost(key: string, value: number) {
    const c = acquisitionCosts.value.find((x) => x.key === key);
    if (c) c.value = value;
  }

  function removeCost(key: string) {
    const isDefault = DEFAULT_COSTS.some((c) => c.key === key);
    if (isDefault && !removedDefaultKeys.value.includes(key)) {
      removedDefaultKeys.value.push(key);
    }
    acquisitionCosts.value = acquisitionCosts.value.filter((x) => x.key !== key);
  }

  function restoreDefault(key: string) {
    const def = DEFAULT_COSTS.find((c) => c.key === key);
    if (!def) return;
    acquisitionCosts.value.push({ ...def });
    removedDefaultKeys.value = removedDefaultKeys.value.filter((k) => k !== key);
  }

  const availableDefaults = computed(() =>
    DEFAULT_COSTS.filter((c) => removedDefaultKeys.value.includes(c.key)),
  );

  function restoreAllDefaults() {
    for (const def of DEFAULT_COSTS) {
      if (removedDefaultKeys.value.includes(def.key)) {
        acquisitionCosts.value.push({ ...def });
      }
    }
    removedDefaultKeys.value = [];
  }

  function addCustomCost() {
    acquisitionCosts.value.push({
      key: `custom_${++costCounter}`,
      labelRu: '',
      labelEn: '',
      labelSr: '',
      type: 'fixed',
      defaultValue: 0,
      value: 0,
      custom: true,
    });
  }

  function updateCostLabel(key: string, label: string) {
    const c = acquisitionCosts.value.find((x) => x.key === key);
    if (c) {
      c.labelRu = label;
      c.labelEn = label;
      c.labelSr = label;
    }
  }

  function updateCostType(key: string, type: 'fixed' | 'pct') {
    const c = acquisitionCosts.value.find((x) => x.key === key);
    if (c) c.type = type;
  }

  function resetCostsToDefaults() {
    acquisitionCosts.value = [];
    removedDefaultKeys.value = DEFAULT_COSTS.map((c) => c.key);
  }

  // Theme — managed by AppHero settings panel
  function initTheme() {
    // Theme initialization is handled by AppHero's onMounted (auto/light/dark)
    // Just set the ref from whatever is on the html element
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    theme.value = current as 'dark' | 'light';
  }

  // Share
  function getShareUrl(): string {
    return encodeShareUrl({
      currency: currency.value,
      propPrice: Number(propPrice.value) || undefined,
      downPayment: Number(downPayment.value) || undefined,
      loan: loan.value,
      termYears: termYears.value,
      termMonths: termMonths.value,
      rateType: rateType.value,
      fixedRate: fixedRate.value,
      indexType: indexType.value,
      indexRate: indexRate.value,
      spread: spread.value,
      payType: payType.value,
      salary: Number(salary.value) || undefined,
      monthlyRent: Number(monthlyRent.value) || undefined,
      eps: epList.value.length > 0 ? epList.value : undefined,
      ics: icList.value.length > 0 ? icList.value : undefined,
      costs: acquisitionCosts.value,
      costsCurrency: costsCurrency.value,
    });
  }

  function loadFromUrl() {
    const state = decodeShareUrl();
    if (!state) return;
    if (state.currency) currency.value = state.currency;
    if (state.propPrice) propPrice.value = state.propPrice;
    if (state.downPayment) downPayment.value = state.downPayment;
    if (state.loan) loan.value = state.loan;
    if (state.termYears) termYears.value = state.termYears;
    if (state.termMonths != null) termMonths.value = state.termMonths;
    if (state.rateType) rateType.value = state.rateType;
    if (state.fixedRate) fixedRate.value = state.fixedRate;
    if (state.indexType) indexType.value = state.indexType;
    if (state.indexRate) indexRate.value = state.indexRate;
    if (state.spread) spread.value = state.spread;
    if (state.payType) payType.value = state.payType;
    if (state.eps) {
      epList.value = state.eps;
      epCounter = Math.max(0, ...state.eps.map((e: EarlyPayment) => e.id));
    }
    if (state.ics) {
      icList.value = state.ics;
      icCounter = Math.max(0, ...state.ics.map((e: IndexChange) => e.id));
    }
    if (state.costs) acquisitionCosts.value = state.costs;
    if (state.costsCurrency) costsCurrency.value = state.costsCurrency;
    if (state.salary) salary.value = state.salary;
    if (state.monthlyRent) monthlyRent.value = state.monthlyRent;
    // Auto-calculate if we have data from URL
    setTimeout(() => calculate(), 100);
  }

  // Init
  async function init() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    startDate.value = d.toISOString().slice(0, 10);
    initTheme();

    // Try loading from URL first
    loadFromUrl();

    fetchFxRates().then((rates: FxRates) => {
      fxRates.value = rates;
    });

    fetchLiveRates().then((rates: LiveRates) => {
      liveRates.value = rates;
      const count = Object.keys(rates).length;
      indexStatus.value = count > 0 ? 'live' : 'stale';
      applyLiveRate();
    });

    fetchSerbiaInflation().then((rate: number) => {
      inflationRate.value = rate;
      inflationStatus.value = rate !== 4.5 ? 'live' : 'stale';
    }).catch(() => {
      inflationStatus.value = 'stale';
    });
  }

  // EP validation
  function getEPValidation() {
    const p = readParams();
    if (!p.loan || !p.termMo) return { perEp: new Map(), globalWarn: null };
    const mRate =
      (rateType.value === 'fixed' ? fixedRate.value : indexRate.value + spread.value) / 1200;
    return validateEPs(epList.value, p.loan, p.termMo, mRate, currency.value);
  }

  // Watch for auto-recalculate
  watch(
    [loan, termYears, termMonths, fixedRate, indexRate, spread],
    () => {
      autoCalc();
    },
  );

  return {
    // State
    currency,
    propPrice,
    downPayment,
    loan,
    termYears,
    termMonths,
    startDate,
    rateType,
    fixedRate,
    indexType,
    indexRate,
    spread,
    payType,
    epList,
    icList,
    scheduleAnn,
    scheduleDif,
    calculated,
    chartType,
    chartPayType,
    timeRange,
    fxRates,
    liveRates,
    indexStatus,
    theme,
    salary,
    monthlyRent,
    inflationRate,
    inflationStatus,
    acquisitionCosts,
    costsCurrency,
    // Getters
    termMo,
    totalRate,
    activeSchedule,
    chartSchedule,
    dpPercent,
    sym,
    costsSym,
    totalFixedCosts,
    totalPctCosts,
    totalAcquisitionCosts,
    totalAcquisitionCostsInMainCurrency,
    maxAffordableLoan,
    isAffordable,
    stressTestResults,
    rentVsBuyAnalysis,
    scenarioA,
    scenarioB,
    // Actions
    saveScenario,
    clearScenario,
    calculate,
    setCurrency,
    onPropChange,
    setRateType,
    setPayType,
    onIndexTypeChange,
    applyLiveRate,
    addEP,
    removeEP,
    updateEP,
    addIC,
    removeIC,
    updateIC,
    updateCost,
    removeCost,
    restoreDefault,
    restoreAllDefaults,
    availableDefaults,
    removedDefaultKeys,
    addCustomCost,
    updateCostLabel,
    updateCostType,
    resetCostsToDefaults,
    initTheme,
    init,
    readParams,
    getEPValidation,
    getShareUrl,
    // Expose for insights
    autoCalc,
    fmt,
    fmtM,
    SYM,
    annuityPmt,
    simExtra,
    buildSchedule,
    computePSK,
  };
});
