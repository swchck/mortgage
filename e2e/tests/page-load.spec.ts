import { test } from '../fixtures/base'
import { expect } from '@playwright/test'

test.describe('Page Load', () => {
  test('hero title is visible with "Mortgage Calculator"', async ({ calcPage }) => {
    await expect(calcPage.heroTitle).toBeVisible()
    await expect(calcPage.heroTitle).toContainText('Mortgage Calculator')
  })

  test('hero subtitle is visible', async ({ calcPage }) => {
    const subtitle = calcPage.page.locator('.hero-sub')
    await expect(subtitle).toBeVisible()
    await expect(subtitle).not.toBeEmpty()
  })

  test('left panel is visible with tabs', async ({ calcPage }) => {
    await expect(calcPage.leftPanel).toBeVisible()

    const tabCount = await calcPage.tabs.count()
    expect(tabCount).toBeGreaterThanOrEqual(3)

    // First tab should be active by default
    await expect(calcPage.tabs.first()).toHaveClass(/active/)
  })

  test('empty state is shown when no calculation has been performed', async ({ calcPage }) => {
    // The right panel should show empty state text
    const emptyTitle = calcPage.page.getByText('Fill in parameters and press')
    await expect(emptyTitle).toBeVisible()

    // No result cards beyond the left-panel card and the empty-state card
    const insightCards = calcPage.page.locator('.insight-card')
    await expect(insightCards).toHaveCount(0)
  })
})
