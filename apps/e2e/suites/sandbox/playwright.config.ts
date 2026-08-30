import { resolve } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { suiteConfig } from '../../shared/playwright.ts';

export default defineConfig({
  ...suiteConfig('sandbox'),
  testDir: resolve(import.meta.dirname, 'tests'),
  projects: [
    {
      name: 'sandbox-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.SANDBOX_URL
    ? undefined
    : {
        command: 'pnpm dev:sandbox --port 5299',
        cwd: resolve(import.meta.dirname, '../../../..'),
        port: 5299,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
});
