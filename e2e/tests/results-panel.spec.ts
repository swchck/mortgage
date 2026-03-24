import { test } from '../fixtures/base'
import { expect } from '@playwright/test'

test.describe('Results Panel', () => {
  test.beforeEach(async ({ calcPage }) => {
    await calcPage.clickCalculate()
    await calcPage.page.waitForSelector('.insight-card', { timeout: 5000 })
  })

  test('insight cards appear after calculation', async ({ calcPage }) => {
    const insightCards = calcPage.page.locator('.insight-card')
    const count = await insightCards.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('schedule table has rows', async ({ calcPage }) => {
    // Scroll to the schedule table area
    await calcPage.scheduleTable.first().scrollIntoViewIfNeeded()
    await expect(calcPage.scheduleTable.first()).toBeVisible()

    const rows = calcPage.page.locator('table tbody tr')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)
  })

  test('multiple result sections are visible', async ({ calcPage }) => {
    // Stat cards with key metrics
    const statElements = calcPage.page.locator('.stat')
    const statCount = await statElements.count()
    expect(statCount).toBeGreaterThanOrEqual(4)

    // Section titles for insights, chart, schedule
    const sectionTitles = calcPage.page.locator('.section-title')
    const titleCount = await sectionTitles.count()
    expect(titleCount).toBeGreaterThanOrEqual(2)
  })
})
