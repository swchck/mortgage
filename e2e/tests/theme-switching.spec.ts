import { test } from '../fixtures/base'
import { expect } from '@playwright/test'

test.describe('Theme Switching', () => {
  test('switch to light theme', async ({ calcPage }) => {
    await calcPage.openSettings()

    // Click the Light theme button
    await calcPage.setTheme('light')

    // Verify html[data-theme="light"]
    const dataTheme = await calcPage.page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBe('light')
  })

  test('switch to dark theme', async ({ calcPage }) => {
    await calcPage.openSettings()

    // First switch to light to ensure we can detect the change back to dark
    await calcPage.setTheme('light')
    await expect(calcPage.page.locator('html')).toHaveAttribute('data-theme', 'light')

    // Now switch to dark
    await calcPage.setTheme('dark')

    await expect(calcPage.page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})
