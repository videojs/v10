import { defineConfig } from 'vite-plus';

import { cachedTaskInputs, workspaceTaskDependencies } from '../../build/task.ts';

const testInputs = [...cachedTaskInputs, '!playwright-report/**', '!test-results/**', '!suites/registry/.generated/**'];

export default defineConfig({
  run: {
    tasks: {
      typecheck: {
        command: 'tsgo --project tsconfig.json --noEmit',
        dependsOn: workspaceTaskDependencies(),
        input: testInputs,
        output: [],
      },
      'prepare:player': {
        command: 'pnpm generate-pages',
        dependsOn: workspaceTaskDependencies(),
        input: testInputs,
        output: ['suites/player/app/src/index.html', 'suites/player/app/src/pages/**'],
      },
      'test:player': {
        command: 'playwright test --config suites/player/playwright.config.ts',
        dependsOn: ['prepare:player'],
        cache: false,
      },
      'test:skin-parity': {
        command: 'playwright test --config suites/skin-parity/playwright.config.ts',
        dependsOn: [...workspaceTaskDependencies(), '@videojs/sandbox#setup', '@videojs/skins#generate'],
        cache: false,
      },
      'test:sandbox': {
        command: 'playwright test --config suites/sandbox/playwright.config.ts',
        dependsOn: ['@videojs/sandbox#setup'],
        cache: false,
      },
      'test:registry': {
        command: 'playwright test --config suites/registry/playwright.config.ts',
        dependsOn: ['@videojs/skins#build:shadcn', '@videojs/react#build', '@videojs/html#build'],
        input: testInputs,
        output: [],
      },
      'test:registry:full': {
        command: 'playwright test --config suites/registry/playwright.config.ts',
        dependsOn: ['@videojs/skins#build:shadcn', '@videojs/react#build', '@videojs/html#build'],
        cache: false,
      },
    },
  },
});
