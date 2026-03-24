import { test } from '../fixtures/base'
import { expect } from '@playwright/test'

test.describe('Language Switching', () => {
  test('switch to Russian', async ({ calcPage }) => {
    // Start in English (fixture sets locale to 'en')
    await expect(calcPage.heroTitle).toContainText('Mortgage Calculator')

    await calcPage.openSettings()
    await calcPage.page.locator('.lang-btn').filter({ hasText: 'RU' }).click()

    await expect(calcPage.heroTitle).toContainText('Ипотечный Калькулятор')
  })

  test('switch to Serbian', async ({ calcPage }) => {
    await expect(calcPage.heroTitle).toContainText('Mortgage Calculator')

    await calcPage.openSettings()
    await calcPage.page.locator('.lang-btn').filter({ hasText: 'SR' }).click()

    await expect(calcPage.heroTitle).toContainText('Kalkulator hipoteke')
  })

  test('switch back to English from another language', async ({ calcPage }) => {
    // Switch to Russian first
    await calcPage.openSettings()
    await calcPage.page.locator('.lang-btn').filter({ hasText: 'RU' }).click()
    await expect(calcPage.heroTitle).toContainText('Ипотечный Калькулятор')

    // Switch back to English
    await calcPage.page.locator('.lang-btn').filter({ hasText: 'EN' }).click()
    await expect(calcPage.heroTitle).toContainText('Mortgage Calculator')
  })
})
