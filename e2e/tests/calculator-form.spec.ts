import { test } from '../fixtures/base'
import { expect } from '@playwright/test'

test.describe('Calculator Form', () => {
  test('default loan amount of 100000 is pre-filled', async ({ calcPage }) => {
    await expect(calcPage.loanInput).toHaveValue('100000')
  })

  test('fill form and calculate produces results', async ({ calcPage }) => {
    await calcPage.setLoanAmount('200000')
    await calcPage.setTermYears('25')
    await calcPage.setFixedRate('5')

    await calcPage.clickCalculate()

    // Wait for results to appear
    await calcPage.page.waitForSelector('.insight-card', { timeout: 5000 })

    // Empty state should be gone
    const emptyTitle = calcPage.page.getByText('Fill in parameters and press')
    await expect(emptyTitle).not.toBeVisible()

    // Result cards should be visible
    const cards = calcPage.page.locator('.card')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThan(1)
  })
})
