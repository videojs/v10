import { resolve } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { suiteConfig } from '../../shared/playwright.ts';

/** CI shards the suite per preset; one value restricts the run to that preset's spec. */
const preset = process.env.VJSC_SKIN_PRESET;

export default defineConfig({
  ...suiteConfig('skin-parity'),
  testDir: resolve(import.meta.dirname, 'tests'),
  testMatch: preset ? `**/vjsc-${preset}-skin-styling.spec.ts` : '**/*.spec.ts',
  // The warm-up compiles every skin and the Tailwind entry before the first case, so workers never race cold transforms.
  globalSetup: resolve(import.meta.dirname, 'setup/global.ts'),
  workers: process.env.CI ? 2 : 4,
  projects: [
    {
      name: 'vjsc-chromium',
      // Both stacked players must fit without scrolling: a capture that scrolls moves the pointer off hovered controls.
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5190', viewport: { width: 1280, height: 1600 } },
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
