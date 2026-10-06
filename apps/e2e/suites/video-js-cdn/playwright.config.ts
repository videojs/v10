import { resolve } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { suiteConfig } from '../../shared/playwright.ts';

export default defineConfig({
  ...suiteConfig('video-js-cdn'),
  testDir: resolve(import.meta.dirname, 'tests'),
  globalSetup: resolve(import.meta.dirname, 'setup/global.ts'),
  // `document.write` ordering, synchronous requests, and CSP enforcement differ by engine, so every engine runs.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
