import { resolve } from 'node:path';

import { defineConfig } from '@playwright/test';

import { suiteConfig, WEB_SERVER_SHUTDOWN } from '../../shared/playwright.ts';
import type { Options } from './test.ts';

export default defineConfig<{}, Options>({
  ...suiteConfig('browserstack'),
  testDir: resolve(import.meta.dirname, 'tests'),
  workers: 1,
  retries: 0,
  globalTimeout: 25 * 60_000,
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL: 'http://bs-local.com:5182',
    // BrowserStack records video; iOS does not support Playwright tracing.
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
    viewport: { width: 960, height: 640 },
    actionTimeout: 15_000,
  },
  projects: process.env.BROWSERSTACK_LOCAL_TEST
    ? [{ name: 'local', use: { baseURL: 'http://127.0.0.1:5182' } }]
    : [
        {
          name: 'chrome-111',
          use: { caps: { browser: 'chrome', browser_version: '111', os: 'Windows', os_version: '10' } },
        },
        {
          name: 'edge-111',
          use: { caps: { browser: 'edge', browser_version: '111', os: 'Windows', os_version: '10' } },
        },
        {
          name: 'firefox-121',
          use: {
            caps: {
              browser: 'playwright-firefox',
              os: 'Windows',
              os_version: '10',
              'browserstack.playwrightVersion': '1.41.2',
            },
          },
        },
        {
          name: 'webkit-16.4',
          use: {
            caps: {
              browser: 'playwright-webkit',
              os: 'OS X',
              os_version: 'Big Sur',
              'browserstack.playwrightVersion': '1.35.0',
            },
          },
        },
        ...(process.env.BROWSERSTACK_IOS_DEVICE
          ? [
              {
                name: 'ios-safari',
                use: {
                  caps: {
                    browser: 'safari',
                    deviceName: process.env.BROWSERSTACK_IOS_DEVICE,
                    osVersion: process.env.BROWSERSTACK_IOS_VERSION || '16.4',
                    realMobile: 'true',
                  },
                  viewport: null,
                },
              },
            ]
          : []),
      ],
  webServer: {
    command: 'pnpm exec vp -C suites/player/app dev --host 0.0.0.0 --port 5182 --strictPort',
    cwd: resolve(import.meta.dirname, '../..'),
    port: 5182,
    env: { __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: 'bs-local.com' },
    timeout: 120_000,
    reuseExistingServer: false,
    gracefulShutdown: WEB_SERVER_SHUTDOWN,
  },
});
