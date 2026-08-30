import { resolve } from 'node:path';

import type { PlaywrightTestConfig } from '@playwright/test';

const CI = Boolean(process.env.CI);
const e2eDir = resolve(import.meta.dirname, '..');

/** Apply the shared reporting, retry, trace, and screenshot policy to one E2E suite. */
export function suiteConfig(name: string): PlaywrightTestConfig {
  return {
    snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
    outputDir: resolve(e2eDir, 'test-results', name),
    timeout: 60_000,
    retries: CI ? 2 : 0,
    fullyParallel: true,
    reporter: CI
      ? [['html', { open: 'never', outputFolder: resolve(e2eDir, 'playwright-report', name) }], ['github'], ['blob']]
      : [['html', { open: 'never', outputFolder: resolve(e2eDir, 'playwright-report', name) }]],
    expect: {
      timeout: 10_000,
      toHaveScreenshot: {
        maxDiffPixelRatio: 0.05,
        threshold: 0.3,
        animations: 'disabled',
      },
    },
    use: {
      trace: CI ? 'on-first-retry' : 'on',
      screenshot: 'only-on-failure',
      video: CI ? 'on-first-retry' : 'off',
      actionTimeout: 10_000,
    },
  };
}
