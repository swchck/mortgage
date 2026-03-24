import { test as base } from '@playwright/test'
import { CalculatorPage } from '../pages/calculator.page'

type CalcFixtures = {
  calcPage: CalculatorPage
}

export const test = base.extend<CalcFixtures>({
  calcPage: async ({ page }, use) => {
    // Force English locale before any page loads
    await page.addInitScript(() => {
      localStorage.setItem('calc-locale', 'en')
    })

    const calcPage = new CalculatorPage(page)
    await calcPage.goto()

    await use(calcPage)
  },
})

export { expect } from '@playwright/test'
