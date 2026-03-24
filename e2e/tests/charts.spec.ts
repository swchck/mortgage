import { test } from '../fixtures/base'
import { expect } from '@playwright/test'

test.describe('Charts', () => {
  test.beforeEach(async ({ calcPage }) => {
    await calcPage.clickCalculate()
    await calcPage.page.waitForSelector('.insight-card', { timeout: 5000 })
  })

  test('canvas element is visible with non-zero dimensions after calculation', async ({
    calcPage,
  }) => {
    // Scroll to chart area
    const chartBox = calcPage.page.locator('.chart-box')
    await chartBox.first().scrollIntoViewIfNeeded()

    // Canvas should be visible
    await expect(calcPage.chartCanvas.first()).toBeVisible()

    // Canvas should have non-zero dimensions
    const dimensions = await calcPage.chartCanvas.first().evaluate((el) => ({
      width: (el as HTMLCanvasElement).width,
      height: (el as HTMLCanvasElement).height,
    }))
    expect(dimensions.width).toBeGreaterThan(0)
    expect(dimensions.height).toBeGreaterThan(0)
  })

  test('chart tabs are present and clickable', async ({ calcPage }) => {
    const chartTabs = calcPage.page.locator('.chart-tab')
    const tabCount = await chartTabs.count()
    expect(tabCount).toBeGreaterThanOrEqual(2)

    // First chart tab should be active
    await expect(chartTabs.first()).toHaveClass(/active/)

    // Click second tab — canvas should still be visible
    if (tabCount > 1) {
      await chartTabs.nth(1).click()
      await expect(calcPage.chartCanvas.first()).toBeVisible()
    }
  })
})
