# CLAUDE.md — Ипотечный Калькулятор (Project Context)

## Что это

Vue 3 + Vite + TypeScript проект — рефакторинг одиночного HTML-файла (`mortgage-calculator.html`, 1157 строк) в полноценный компонентный проект. Оригинальный HTML является **эталоном** для внешнего вида, логики расчётов и поведения.

---

## Стек

| Технология | Версия | Роль |
|---|---|---|
| Vue 3 | ^3.4 | Composition API, `<script setup>` |
| Vite | ^5.3 | Сборщик |
| TypeScript | ^5.4 | strict mode |
| Pinia | ^2.1 | Глобальный стейт |
| vue-i18n | ^9.13 | ru/en переключение |
| Chart.js | ^4.4 | 4 типа графиков |
| SheetJS (xlsx) | ^0.18 | CSV + Excel экспорт |
| Vitest | ^1.6 | Unit тесты |
| ESLint + Prettier | — | Линтинг |

---

## Структура файлов

```
mortgage-calc/
├── index.html
├── package.json
├── vite.config.ts          # base path = /mortgage-calculator/ для GitHub Pages
├── tsconfig*.json
├── .eslintrc.cjs
├── .prettierrc
├── .env.local.example      # VITE_BASE_PATH=/ для локальной разработки
├── .github/
│   └── workflows/deploy.yml  # GitHub Actions → GitHub Pages
├── public/
│   └── favicon.svg
└── src/
    ├── main.ts             # createApp + Pinia + i18n
    ├── App.vue             # onMounted: theme, fetchFxRates, fetchLiveRates
    ├── types.ts            # Все типы (Currency, RateType, PayType, ScheduleRow и др.)
    ├── components/
    │   ├── AppHero.vue     # Шапка: заголовок, FX-бар, кнопка темы
    │   ├── ui/
    │   │   ├── AppModal.vue      # ВАЖНО: использует <Teleport to="body">
    │   │   ├── AppToggle.vue     # Generic toggle (v-model)
    │   │   └── TipIcon.vue       # Иконка «i» → открывает AppModal
    │   ├── LeftPanel/
    │   │   ├── LeftPanel.vue     # Табы + .tab-scroll + кнопка Рассчитать
    │   │   ├── TabParams.vue     # Валюта, Объект, Сумма, Ставка, Тип платежа
    │   │   ├── TabEarlyPayment.vue  # Досрочные платежи
    │   │   └── TabIndex.vue      # Изменения индекса по месяцам
    │   └── RightPanel/
    │       ├── RightPanel.vue    # Empty state / структура результатов
    │       ├── ResultsPanel.vue  # 6 stat-карточек + progress bar
    │       ├── InsightsPanel.vue # Стратегия погашения (всегда открыта)
    │       ├── ChartPanel.vue    # Chart.js: 4 типа + time filter
    │       └── ScheduleTable.vue # Таблица + CSV/Excel экспорт
    ├── stores/
    │   └── useCalcStore.ts  # Pinia store: весь стейт + авторасчёт debounce 600ms
    ├── utils/
    │   ├── calc.ts          # Чистый расчётный движок (DOM-free)
    │   ├── calc.test.ts     # 14 Vitest тестов
    │   ├── format.ts        # fmt(), fmtM(), SYM
    │   ├── validate.ts      # validateEPs()
    │   └── exportData.ts    # exportCSV(), exportExcel()
    ├── services/
    │   ├── fx.ts            # fetchFxRates (open.er-api.com)
    │   └── rates.ts         # fetchLiveRates: ECB API (EURIBOR) + NY Fed (SOFR)
    ├── i18n/
    │   ├── ru.ts
    │   ├── en.ts
    │   └── index.ts
    ├── data/
    │   └── modals.ts        # Контент всех модалок (10 штук)
    └── styles/
        └── index.css        # Все стили (dark/light токены, компоненты, responsive)
```

---

## Ключевые архитектурные решения

### Pinia Store (`useCalcStore.ts`)
- Весь стейт в одном store
- Авторасчёт: `watch([loan, termYears, ...], scheduleRecalc, { deep: true })` с debounce 600ms
- `scheduleAnn` и `scheduleDif` считаются **оба** при каждом расчёте
- `activeSchedule` — computed, зависит от `payType`
- `chartSchedule` — computed, зависит от `chartPayType` (независимый переключатель в графике)
- `setCurrency()` конвертирует loan/propPrice/downPayment через fxRates

### Модалки
- `AppModal` использует `<Teleport to="body">` — обязательно, иначе z-index не работает
- `TipIcon` — просто иконка `i`, при клике открывает `AppModal` с нужным контентом
- Контент модалок в `src/data/modals.ts`, HTML разметка (ссылки, code, strong)

### Левая панель (layout)
- **НЕ** `position: sticky` — это вызывает налезание элементов на мобайле
- `.tab-scroll { max-height: calc(100vh - 220px); overflow-y: auto; }` — только на десктопе
- На мобайле (`max-width: 900px`): `max-height: none; overflow-y: visible`
- Кнопка «Рассчитать» всегда внизу через `margin-top: auto` в flex-column

### Правая панель (структура)
Точная структура из оригинального HTML:
```
Card 1: padding:18px
  ├── ResultsPanel (6 stat-карточек + full-width срок + progress bar)
  ├── <div> "Стратегия погашения" + badge "Insights"
  └── InsightsPanel (всегда открыт, без коллапса)

Card 2: ChartPanel (Графики)

Card 3: ScheduleTable (График платежей + экспорт)
```

### InsightsPanel — 6 карточек
1. Дифф vs Аннуитет (или «Аннуитет рационален» если разница < 0.5%)
2. Досрочное +10% к платежу (симуляция через `simExtra`)
3. Лучшее время для досрочного (первые 30% срока)
4. Рефинансирование −2 п.п. (показывается если экономия > 1% тела)
5. Стратегия: срок vs платёж (всегда)
6. Налоговый вычет — только если `currency === 'RUB'`

### CSS токены
```css
/* Dark (default) */
--bg:#070d1a; --surface:#0d1629; --surface2:#111d35; --border:#1e2e4d;
--gold:#f0b429; --blue:#60a5fa; --green:#34d399; --red:#f87171;
--text:#e2e8f0; --muted:#8899aa;

/* Light */
--bg:#f1f5fb; --surface:#fff; --surface2:#e8eef8; --border:#c8d6ea;
--gold:#b06e00; --blue:#1d4ed8; --green:#047857; --red:#b91c1c;
```

### Цвета графиков (важно — как в оригинале)
- Осн. долг → `rgba(96,165,250,.75)` (синий)
- Проценты → `rgba(240,180,41,.75)` (золотой)
- Досрочно → `rgba(52,211,153,.85)` (зелёный)
- Остаток (линия) → `rgba(248,113,113,.8)` (красный)

### Live API
- FX: `https://open.er-api.com/v6/latest/EUR`
- EURIBOR 3M/6M/12M: ECB Data API `https://data-api.ecb.europa.eu/service/data/FM/...`
- SOFR: `https://markets.newyorkfed.org/api/rates/sofr/last/1.json` (+ allorigins.win fallback)

---

## Запуск

```bash
unzip mortgage-calculator-vue.zip
cd mortgage-calc
cp .env.local.example .env.local   # VITE_BASE_PATH=/
npm install
npm run dev       # http://localhost:5173/
npm test          # Vitest (14 тестов)
npm run build     # dist/
npm run lint      # ESLint
npm run format    # Prettier
```

## GitHub Pages

1. Создать репо (имя = `REPO_NAME` в `vite.config.ts`)
2. Settings → Pages → Source → **GitHub Actions**
3. Push в `master`/`main`

`VITE_BASE_PATH` в workflow подхватывается автоматически из `github.event.repository.name`.

---

## Известные проблемы и их решения

| Проблема | Решение |
|---|---|
| Мусорные директории с `{...}` в именах | `mkdir -p` не делает brace expansion в bash — создавать каждую папку отдельно |
| Модалки не открываются / z-index | `<Teleport to="body">` в AppModal.vue |
| Элементы налезают при скролле на мобайле | Убрать `position:sticky` с левой панели |
| Symbol валюты дублируется в инпутах | Символ в `position:absolute` span, инпут без суффикса |
| InsightsPanel внутри stat-плиток | Это отдельный блок внутри того же card, после ResultsPanel |
| `noUnusedLocals` ошибки TS | Проверять импорты: `SYM`, `fmt`, `buildSchedule` в компонентах |

---

## Оригинальный HTML

Расположен в `/home/claude/mortgage-calculator.html` (1157 строк).  
Является **эталоном** — при любых вопросах о поведении, стилях или логике смотреть туда.  
Особенно важны разделы:
- CSS (строки 10–235): все токены, классы, медиазапросы
- `renderResults()` (строки 820–856): структура stat-карточек
- `renderInsights()` (строки 858–960): логика всех инсайтов
- `renderChart()` (строки 998–1069): цвета и типы графиков
