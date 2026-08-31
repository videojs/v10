import { resolve } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { suiteConfig } from '../../shared/playwright.ts';

export default defineConfig({
  ...suiteConfig('skin-parity'),
  testDir: resolve(import.meta.dirname, 'tests'),
  // Every case shares one transform-heavy development server. Bound cold browser graphs so they cannot exhaust it.
  workers: 2,
  projects: [
    {
      name: 'vjsc-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5190' },
    },
  ],
  webServer: {
    command: 'pnpm exec vp -C dev dev --host --port 5190 --strictPort',
    cwd: resolve(import.meta.dirname, '../../../../packages/skins'),
    port: 5190,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
