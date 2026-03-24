import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173/',
    trace: 'on-first-retry',
  },

  projects: [
    // ── Desktop: 3 browsers × 2 MacBook sizes ──────────────────────────

    {
      name: 'chromium-macbook13',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'chromium-macbook15',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1680, height: 1050 },
      },
    },
    {
      name: 'firefox-macbook13',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'firefox-macbook15',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1680, height: 1050 },
      },
    },
    {
      name: 'webkit-macbook13',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'webkit-macbook15',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1680, height: 1050 },
      },
    },

    // ── iOS devices (WebKit only) ───────────────────────────────────────

    {
      name: 'iphone-se',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'iphone-12',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'iphone-13',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'iphone-14',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'iphone-14-pro-max',
      use: { ...devices['iPhone 14 Pro Max'] },
    },
    {
      name: 'iphone-15-pro',
      use: { ...devices['iPhone 15 Pro'] },
    },
    {
      name: 'ipad-mini',
      use: { ...devices['iPad Mini'] },
    },
    {
      name: 'ipad-pro-11',
      use: { ...devices['iPad Pro 11'] },
    },
    {
      name: 'ipad-air',
      use: {
        browserName: 'webkit',
        viewport: { width: 820, height: 1180 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'ipad-pro-12.9',
      use: {
        browserName: 'webkit',
        viewport: { width: 1024, height: 1366 },
        isMobile: true,
        hasTouch: true,
      },
    },

    // ── Android devices (Chromium only) ─────────────────────────────────

    {
      name: 'pixel-7',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'samsung-galaxy-s21',
      use: {
        browserName: 'chromium',
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'samsung-galaxy-tab-s8',
      use: {
        browserName: 'chromium',
        viewport: { width: 800, height: 1280 },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/',
    reuseExistingServer: true,
  },
})
