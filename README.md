# Mortgage Calculator / Калькулятор Ипотеки

<div align="center">

**Продвинутый ипотечный калькулятор с поддержкой досрочных платежей, плавающих ставок и аналитики**

[![Vue 3](https://img.shields.io/badge/Vue-3.4-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-f0b429)](LICENSE)

</div>

---

## Возможности

- **4 валюты** — RUB, EUR, USD, RSD с автоматической конвертацией по курсу
- **Аннуитетные и дифференцированные** платежи — сравнение в один клик
- **Досрочные погашения** — фиксированная сумма или % от остатка, сокращение срока или платежа
- **Плавающие ставки** — EURIBOR 3M/6M/12M, SOFR с подгрузкой актуальных значений
- **Изменения индекса** — моделирование сценариев изменения ставки по месяцам
- **7 типов графиков** — платежи, остаток, структура, годовой, ставка, проценты/долг, кумулятивный
- **Insights-панель** — рекомендации по стратегии: досрочное погашение, рефинансирование, налоговый вычет
- **Экспорт** — CSV и Excel (xlsx)
- **Тёмная и светлая** темы
- **Русский и английский** интерфейс
- **Адаптивный дизайн** — desktop и mobile

## Скриншот

> Запустите `npm run dev` и откройте http://localhost:5173 для демо

## Стек

|     | Технология     | Назначение                            |
| --- | -------------- | ------------------------------------- |
| ⚡  | **Vite 5**     | Сборка и dev-сервер                   |
| 🖖  | **Vue 3**      | UI, Composition API, `<script setup>` |
| 🔷  | **TypeScript** | Строгая типизация                     |
| 🍍  | **Pinia**      | Управление состоянием                 |
| 🌐  | **vue-i18n**   | Интернационализация (ru/en)           |
| 📊  | **Chart.js**   | Визуализация графиков                 |
| 📑  | **SheetJS**    | Экспорт в CSV/Excel                   |
| 🧪  | **Vitest**     | Unit-тесты                            |
| 🎭  | **Playwright** | E2E-тесты                             |

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev

# Сборка для продакшена
npm run build

# Запуск тестов
npm test

# E2E тесты
npm run test:e2e
```

## Структура проекта

```
src/
├── components/
│   ├── AppHero.vue            # Шапка: заголовок, курсы валют, тема
│   ├── LeftPanel/             # Ввод параметров (табы)
│   │   ├── TabParams.vue      #   Основные параметры кредита
│   │   ├── TabEarlyPayment.vue#   Досрочные платежи
│   │   └── TabIndex.vue       #   Изменения индекса
│   ├── RightPanel/            # Результаты
│   │   ├── ResultsPanel.vue   #   Сводка и stat-карточки
│   │   ├── InsightsPanel.vue  #   Аналитика и рекомендации
│   │   ├── ChartPanel.vue     #   Графики (7 типов)
│   │   └── ScheduleTable.vue  #   Таблица платежей + экспорт
│   └── ui/                    # Переиспользуемые компоненты
├── stores/
│   └── useCalcStore.ts        # Pinia: стейт, расчёт, авторасчёт
├── utils/
│   ├── calc.ts                # Расчётный движок (без DOM)
│   ├── format.ts              # Форматирование чисел и валют
│   ├── validate.ts            # Валидация досрочных платежей
│   └── exportData.ts          # CSV/Excel экспорт
├── services/
│   ├── fx.ts                  # Курсы валют (open.er-api.com)
│   └── rates.ts               # Live-ставки: EURIBOR, SOFR
├── i18n/                      # Локализация ru/en
├── data/
│   └── modals.ts              # Контент информационных модалок
└── styles/
    └── index.css              # CSS-токены, темы, responsive
```

## Расчётный движок

Ядро калькулятора — чистая функция `buildSchedule()` в `src/utils/calc.ts`, не зависящая от DOM и фреймворка. Поддерживает:

- Аннуитетную и дифференцированную схемы
- Досрочные погашения с пересчётом графика
- Плавающие ставки с изменениями по месяцам
- Параллельный расчёт обеих схем для сравнения

## API-интеграции

| Источник        | Данные            | URL                               |
| --------------- | ----------------- | --------------------------------- |
| open.er-api.com | Курсы валют       | `GET /v6/latest/EUR`              |
| ECB Data API    | EURIBOR 3M/6M/12M | `GET /service/data/FM/...`        |
| NY Fed          | SOFR              | `GET /api/rates/sofr/last/1.json` |

## Лицензия

[MIT](LICENSE) — Bogomazov Andrei
