import { test } from '../fixtures/base'
import { expect } from '@playwright/test'

test.describe('Share', () => {
  test('clicking share triggers copy and shows confirmation', async ({ calcPage }) => {
    // Calculate first so there are params to share
    await calcPage.clickCalculate()
    await calcPage.page.waitForSelector('.insight-card', { timeout: 5000 })

    // Mock clipboard.writeText to capture the URL
    let copiedText = ''
    await calcPage.page.evaluate(() => {
      (navigator.clipboard as unknown as Record<string, unknown>).writeText = (text: string) => {
        (window as unknown as Record<string, string>).__copiedText = text
        return Promise.resolve()
      }
    })

    // Click share button
    await calcPage.clickShare()

    // Small wait for the async copy
    await calcPage.page.waitForTimeout(500)

    // Read the captured text
    copiedText = await calcPage.page.evaluate(() =>
      (window as unknown as Record<string, string>).__copiedText || '',
    )

    // URL should contain query parameters
    expect(copiedText).toContain('?')
    expect(copiedText).toMatch(/https?:\/\//)
    expect(copiedText).toContain('l=') // loan param
  })
})
