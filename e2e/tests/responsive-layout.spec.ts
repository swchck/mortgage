import { test } from '../fixtures/base'
import { expect } from '@playwright/test'

test.describe('Responsive Layout', () => {
  test('no horizontal overflow on desktop viewport', async ({ calcPage }) => {
    const bodyScrollWidth = await calcPage.page.evaluate(() => document.body.scrollWidth)
    const windowInnerWidth = await calcPage.page.evaluate(() => window.innerWidth)
    expect(bodyScrollWidth).toBeLessThanOrEqual(windowInnerWidth)
  })

  test('content is accessible on mobile viewport (375px)', async ({ calcPage }) => {
    await calcPage.page.setViewportSize({ width: 375, height: 812 })

    // Hero title should still be visible
    await expect(calcPage.heroTitle).toBeVisible()

    // Left panel should be visible (single-column layout on mobile)
    await expect(calcPage.leftPanel).toBeVisible()

    // Calculate button should be visible
    await expect(calcPage.calculateButton).toBeVisible()

    // No horizontal overflow
    const bodyScrollWidth = await calcPage.page.evaluate(() => document.body.scrollWidth)
    const windowInnerWidth = await calcPage.page.evaluate(() => window.innerWidth)
    expect(bodyScrollWidth).toBeLessThanOrEqual(windowInnerWidth)
  })

  test('layout switches to single column at 900px breakpoint', async ({ calcPage }) => {
    await calcPage.page.setViewportSize({ width: 899, height: 768 })

    // The main-grid should use single-column layout
    const mainGrid = calcPage.page.locator('.main-grid')
    const gridColumns = await mainGrid.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns,
    )

    // On mobile, grid-template-columns should be "1fr" (single value)
    // It resolves to the actual pixel width as a single value
    const columnValues = gridColumns.split(' ').filter((v) => v.trim())
    expect(columnValues.length).toBe(1)
  })
})
