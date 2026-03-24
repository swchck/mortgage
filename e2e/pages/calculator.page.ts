import { type Locator, type Page } from '@playwright/test'

export class CalculatorPage {
  readonly page: Page

  // Hero
  readonly heroTitle: Locator
  readonly heroActions: Locator

  // Left panel
  readonly leftPanel: Locator
  readonly tabs: Locator
  readonly calculateButton: Locator

  // Form inputs
  readonly loanInput: Locator
  readonly termYearsInput: Locator
  readonly fixedRateInput: Locator

  // Settings / Share / Language / Theme
  readonly settingsButton: Locator
  readonly shareButton: Locator
  readonly languageButtons: Locator
  readonly themeModeButtons: Locator

  // Right panel — results
  readonly resultCards: Locator
  readonly chartCanvas: Locator
  readonly scheduleTable: Locator

  constructor(page: Page) {
    this.page = page

    // Hero
    this.heroTitle = page.locator('.hero-title')
    this.heroActions = page.locator('.hero-actions')

    // Left panel
    this.leftPanel = page.locator('.left-panel')
    this.tabs = page.locator('.tab')
    this.calculateButton = page.locator('.left-panel .btn-primary')

    // Form inputs — use unique step/min/max combos
    this.loanInput = page.locator('input[type="number"][step="10000"]')
    this.termYearsInput = page.locator('input[type="number"][min="1"][max="50"]')
    this.fixedRateInput = page.locator('input[type="number"][step="0.01"][max="50"]')

    // Settings — gear icon button inside .hero-actions
    this.settingsButton = this.heroActions.getByRole('button').filter({ has: page.locator('svg.lucide-settings') })
    this.shareButton = this.heroActions.getByRole('button').filter({ has: page.locator('svg.lucide-share-2') })
    this.languageButtons = page.locator('.lang-btn')
    this.themeModeButtons = page.locator('.theme-mode-btn')

    // Right panel
    this.resultCards = page.locator('.card')
    this.chartCanvas = page.locator('canvas')
    this.scheduleTable = page.locator('table')
  }

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async setLoanAmount(amount: string) {
    await this.loanInput.fill(amount)
  }

  async setTermYears(years: string) {
    await this.termYearsInput.fill(years)
  }

  async setFixedRate(rate: string) {
    await this.fixedRateInput.fill(rate)
  }

  async clickCalculate() {
    await this.calculateButton.click()
  }

  async switchLanguage(lang: 'ru' | 'en' | 'sr') {
    await this.languageButtons.filter({ hasText: lang.toUpperCase() }).click()
  }

  async openSettings() {
    await this.settingsButton.click()
  }

  async setTheme(mode: 'light' | 'auto' | 'dark') {
    const labels: Record<string, RegExp> = {
      light: /light|светлая/i,
      auto: /auto/i,
      dark: /dark|тёмная/i,
    }
    await this.themeModeButtons.filter({ hasText: labels[mode] }).click()
  }

  async clickShare() {
    await this.shareButton.click()
  }
}
