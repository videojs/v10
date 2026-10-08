import { resolve } from 'node:path';

import { defineConfig } from '@playwright/test';

import { suiteConfig, WEB_SERVER_SHUTDOWN } from '../../shared/playwright.ts';
import type { Options } from './test.ts';
import { compatVersions, versions } from './versions.ts';

// The WebKit and iOS projects run every skin, which holds only while both queries share their minimums.
if (compatVersions.safari !== versions.safari || compatVersions.ios !== versions.ios) {
  throw new Error('Compat has its own Safari or iOS minimum; add Compat WebKit and iOS projects.');
}

export default defineConfig<{}, Options>({
  ...suiteConfig('browserstack'),
  testDir: resolve(import.meta.dirname, 'tests'),
  testMatch: '**/*.spec.ts',
  workers: 5,
  retries: 0,
  // Remote media readiness and seeking can each take up to 40 seconds.
  timeout: 3 * 60_000,
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
          name: `chrome-${versions.chrome}`,
          use: {
            caps: { browser: 'chrome', browser_version: versions.chrome, os: 'Windows', os_version: '10' },
            version: versions.chrome,
            skins: ['default', 'neutral'],
          },
        },
        {
          name: `edge-${versions.edge}`,
          use: {
            caps: { browser: 'edge', browser_version: versions.edge, os: 'Windows', os_version: '10' },
            version: versions.edge,
            skins: ['default', 'neutral'],
          },
        },
        // Bundled engines require a Playwright release; version checks reject any drift from browserslist.
        {
          name: `firefox-${versions.firefox}`,
          use: {
            caps: {
              browser: 'playwright-firefox',
              os: 'Windows',
              os_version: '10',
              'browserstack.playwrightVersion': '1.41.2',
            },
            version: versions.firefox,
            skins: ['default', 'neutral'],
          },
        },
        // Compat supports older Chrome, Edge, and Firefox than the other skins; Safari and iOS share one minimum.
        {
          name: `compat-chrome-${compatVersions.chrome}`,
          use: {
            caps: { browser: 'chrome', browser_version: compatVersions.chrome, os: 'Windows', os_version: '10' },
            version: compatVersions.chrome,
            skins: ['compat'],
          },
        },
        {
          name: `compat-edge-${compatVersions.edge}`,
          use: {
            caps: { browser: 'edge', browser_version: compatVersions.edge, os: 'Windows', os_version: '10' },
            version: compatVersions.edge,
            skins: ['compat'],
          },
        },
        {
          name: `compat-firefox-${compatVersions.firefox}`,
          use: {
            caps: {
              browser: 'playwright-firefox',
              os: 'Windows',
              os_version: '10',
              // The oldest release BrowserStack can drive with the current client; older ones fail to create a context.
              'browserstack.playwrightVersion': '1.25.2',
            },
            version: compatVersions.firefox,
            skins: ['compat'],
          },
        },
        {
          name: `webkit-${versions.safari}`,
          use: {
            caps: {
              browser: 'playwright-webkit',
              os: 'OS X',
              os_version: 'Big Sur',
              'browserstack.playwrightVersion': '1.35.0',
            },
            version: versions.safari,
          },
        },
        {
          name: `ios-safari-${versions.ios}`,
          use: {
            caps: { browser: 'safari', osVersion: versions.ios, realMobile: 'true' },
            version: versions.ios,
            // BrowserStack iOS requires an explicit viewport object.
            viewport: { width: 390, height: 844 },
          },
        },
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
