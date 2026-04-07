import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  fullyParallel: true,

  reporter: CI ? [['html', { open: 'never' }], ['github'], ['blob']] : [['html', { open: 'on-failure' }]],

  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: 'disabled',
    },
  },

  use: {
    trace: CI ? 'on-first-retry' : 'on',
    screenshot: 'only-on-failure',
    video: CI ? 'on-first-retry' : 'off',
    actionTimeout: 10_000,
  },

  projects: [
    // --- Chromium ---
    {
      name: 'vite-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5180' },
    },

    // --- Firefox / Gecko ---
    {
      name: 'vite-firefox',
      use: { ...devices['Desktop Firefox'], baseURL: 'http://localhost:5180' },
    },

    // --- WebKit (HLS pages skipped at test level via test.fixme — WebKit
    //     lacks MSE so <hls-video> falls back to native HLS which is
    //     unreliable in headless mode) ---
    {
      name: 'vite-webkit',
      use: { ...devices['Desktop Safari'], baseURL: 'http://localhost:5180' },
    },

    // --- Future: Next.js ---
    // {
    //   name: 'next-chromium',
    //   use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3100' },
    // },

    // --- Future: Astro ---
    // {
    //   name: 'astro-chromium',
    //   use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4400' },
    // },
  ],

  webServer: [
    {
      command: 'npx vite --port 5180',
      cwd: './apps/vite',
      port: 5180,
      reuseExistingServer: !CI,
      timeout: 120_000,
    },

    // --- Future: Next.js ---
    // {
    //   command: 'pnpm next dev --port 3100',
    //   cwd: './apps/next',
    //   port: 3100,
    //   reuseExistingServer: !CI,
    //   timeout: 120_000,
    // },

    // --- Future: Astro ---
    // {
    //   command: 'pnpm astro dev --port 4400',
    //   cwd: './apps/astro',
    //   port: 4400,
    //   reuseExistingServer: !CI,
    //   timeout: 120_000,
    // },
  ],
});
