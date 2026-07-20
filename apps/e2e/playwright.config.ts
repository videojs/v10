import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;
const SANDBOX_SPEC = /sandbox-.*i18n\.spec\.ts/;
const VALUE_OPTIONS = new Set([
  '-c',
  '-g',
  '-j',
  '-p',
  '-u',
  '--browser',
  '--config',
  '--global-timeout',
  '--grep',
  '--grep-invert',
  '--max-failures',
  '--output',
  '--project',
  '--repeat-each',
  '--reporter',
  '--retries',
  '--shard',
  '--test-list',
  '--test-list-invert',
  '--timeout',
  '--trace',
  '--tsconfig',
  '--update-snapshots',
  '--workers',
]);

const args = process.argv.slice(2).filter((arg, index) => !(index === 0 && arg === 'test'));
const selectedProjects = args.flatMap((arg, index) => {
  if (arg === '--project' || arg === '-p') {
    return args[index + 1] ? [args[index + 1]] : [];
  }
  return arg.startsWith('--project=') ? [arg.slice('--project='.length)] : [];
});
const testFilters = args.filter((arg, index) => !arg.startsWith('-') && !VALUE_OPTIONS.has(args[index - 1] ?? ''));
const selectedViteProject = selectedProjects.some((name) => name.startsWith('vite-'));
const selectedSandboxProject = selectedProjects.some((name) => name.startsWith('sandbox-'));
const selectedSandboxSpec = testFilters.some((arg) => SANDBOX_SPEC.test(arg));
const unfilteredRun = selectedProjects.length === 0 && testFilters.length === 0;
const shouldStartViteServer =
  selectedViteProject ||
  unfilteredRun ||
  (selectedProjects.length === 0 && testFilters.some((arg) => !SANDBOX_SPEC.test(arg)));
const shouldStartSandboxServer =
  !process.env.SANDBOX_URL && (selectedSandboxProject || selectedSandboxSpec || unfilteredRun);

export default defineConfig({
  testDir: './tests',
  // Strip the OS suffix from snapshot paths so one set of baselines works
  // on both macOS (local) and Linux (CI). The generous thresholds below
  // absorb minor cross-platform rendering differences.
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
  timeout: 60_000,
  retries: CI ? 2 : 0,
  fullyParallel: true,

  reporter: CI ? [['html', { open: 'never' }], ['github'], ['blob']] : [['html', { open: 'on-failure' }]],

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

  projects: [
    // --- Chromium ---
    {
      name: 'vite-chromium',
      testIgnore: SANDBOX_SPEC,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5180' },
    },

    // --- WebKit ---
    {
      name: 'vite-webkit',
      testIgnore: SANDBOX_SPEC,
      use: { ...devices['Desktop Safari'], baseURL: 'http://localhost:5180' },
    },

    // --- Firefox ---
    {
      name: 'vite-firefox',
      testIgnore: SANDBOX_SPEC,
      use: { ...devices['Desktop Firefox'], baseURL: 'http://localhost:5180' },
    },

    {
      name: 'sandbox-chromium',
      testMatch: SANDBOX_SPEC,
      use: { ...devices['Desktop Chrome'] },
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
    ...(shouldStartViteServer
      ? [
          {
            command: 'npx vite --port 5180',
            cwd: './apps/vite',
            port: 5180,
            reuseExistingServer: !CI,
            timeout: 120_000,
          },
        ]
      : []),
    ...(shouldStartSandboxServer
      ? [
          {
            command:
              'pnpm --dir ../.. build:cdn && node_modules/.bin/tsx scripts/setup.ts && node_modules/.bin/vite --host --port 5299',
            cwd: '../sandbox',
            port: 5299,
            reuseExistingServer: !CI,
            timeout: 300_000,
          },
        ]
      : []),

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
