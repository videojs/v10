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
  // The app folder is not a workspace package, so run vite from the e2e package, which owns the dependency, and point
  // it at the app config; the config resolves its own root. npx walks up to the binary the way the old layout relied on.
  webServer: {
    command: 'npx vite --config suites/player/app/vite.config.ts --port 5180',
    cwd: resolve(import.meta.dirname, '../..'),
    port: 5180,
    stdout: 'pipe',
    stderr: 'pipe',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
