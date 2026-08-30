import { resolve } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { suiteConfig } from '../../shared/playwright.ts';

export default defineConfig({
  ...suiteConfig('player'),
  testDir: resolve(import.meta.dirname, 'tests'),
  projects: [
    {
      name: 'vite-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5180' },
    },
    {
      name: 'vite-webkit',
      use: { ...devices['Desktop Safari'], baseURL: 'http://localhost:5180' },
    },
    {
      name: 'vite-firefox',
      use: { ...devices['Desktop Firefox'], baseURL: 'http://localhost:5180' },
    },
  ],
  webServer: {
    command: 'pnpm exec vite --port 5180',
    cwd: resolve(import.meta.dirname, 'app'),
    port: 5180,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
