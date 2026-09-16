import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { getViteConfig } from 'astro/config';
import type { Plugin, ViteUserConfig } from 'vite-plus';
import { configDefaults } from 'vite-plus/test/config';

import { cachedTaskInputs, cachedTaskOutputs, workspaceTaskDependencies } from '../build/task.ts';
import { demoPlaceholderPlugin } from './scripts/replace-demo-placeholders.ts';

// SAFETY: @vitejs/plugin-react and the workspace resolve Plugin from the catalog-pinned Vite implementation.
const reactPlugins = react() as Plugin[];

// Typed as Vite+'s `ViteUserConfig` (Vite's config augmented with `test`) and
// passed as a variable: Astro 7's `getViteConfig` param no longer surfaces the
// Vite+ module augmentation, so a fresh object literal trips an excess-property
// check on `test`. A variable is only checked for structural assignability.
const config: ViteUserConfig = {
  plugins: [demoPlaceholderPlugin(), ...reactPlugins],
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'site',
          include: configDefaults.include,
          exclude: [
            ...configDefaults.exclude,
            'src/utils/docs/__tests__/preferences.test.ts',
            'src/utils/mux/__tests__/auth-flow.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'site/dom',
          include: ['src/utils/docs/__tests__/preferences.test.ts', 'src/utils/mux/__tests__/auth-flow.test.ts'],
          environment: 'jsdom',
          setupFiles: ['./src/test-setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Cover executable site logic, not Astro templates, rendered demos, React UI,
      // type-only modules, or the API builder's input fixtures.
      include: ['src/utils/**/*.ts', 'src/types/docs.ts', 'scripts/api-docs-builder/src/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**', '**/tests/**'],
      // Negative thresholds cap the existing uncovered-item debt. Unlike a single
      // percentage, adding a large well-covered file cannot hide a regression in
      // another domain.
      thresholds: {
        'scripts/api-docs-builder/src/*.ts': {
          statements: -572,
          branches: -766,
          functions: -52,
          lines: -306,
        },
        'src/utils/**/*.ts': {
          statements: -241,
          branches: -198,
          functions: -55,
          lines: -205,
        },
        'src/types/docs.ts': {
          statements: -3,
          branches: -2,
          functions: -1,
          lines: -1,
        },
      },
    },
  },
  run: {
    tasks: {
      'api-docs:generate': {
        command: 'tsx scripts/api-docs-builder/src/index.ts',
        dependsOn: workspaceTaskDependencies(),
        input: [
          // Keep the extractor's workspace-wide TypeScript inputs explicit.
          // Automatic tracking also observes unrelated generated directories
          // while Vite/Astro load this config, causing false cache misses.
          'scripts/api-docs-builder/**',
          'src/utils/api-reference-overrides.ts',
          { pattern: 'package.json', base: 'workspace' },
          { pattern: 'pnpm-lock.yaml', base: 'workspace' },
          { pattern: 'tsconfig.base.json', base: 'workspace' },
          {
            pattern:
              'packages/{cdn,core,dash.js,hls.js,html,media,mux-data,react,shaka,spf,utils,vimeo,wistia}/package.json',
            base: 'workspace',
          },
          {
            pattern: 'packages/{cdn,core,dash.js,hls.js,html,media,mux-data,react,shaka,spf,utils,vimeo,wistia}/src/**',
            base: 'workspace',
          },
          { pattern: '!packages/**/*.tsbuildinfo', base: 'workspace' },
          { pattern: '!packages/cdn/src/locales', base: 'workspace' },
          { pattern: '!packages/cdn/src/locales/**', base: 'workspace' },
        ],
        output: [
          'src/content/generated-component-reference/**',
          'src/content/generated-util-reference/**',
          'src/content/generated-feature-reference/**',
          'src/content/generated-media-reference/**',
          'src/content/generated-preset-reference/**',
        ],
      },
      'cdn-manifest': {
        command: 'tsx scripts/build-cdn-manifest.ts',
        dependsOn: workspaceTaskDependencies('build:cdn'),
        input: cachedTaskInputs,
        output: ['src/content/cdn-media.json'],
      },
      build: {
        // Astro observes pnpm's selector-specific lifecycle metadata and host
        // session values even though they do not affect the output, so normalize
        // them for cross-task cache reuse.
        command:
          "SHLVL=0 XPC_SERVICE_NAME=0 npm_lifecycle_event=vite-plus npm_lifecycle_script='astro build' astro build",
        dependsOn: ['api-docs:generate', 'cdn-manifest'],
        // Astro regenerates and consumes collection schemas during one build.
        // They are tool-managed state rather than stable inputs or outputs.
        input: [...cachedTaskInputs, '!.astro/**', '!.netlify/**'],
        output: [...cachedTaskOutputs, '!.astro/**', '!.netlify/**'],
        env: [
          'OAUTH_CLIENT_ID',
          'OAUTH_CLIENT_SECRET',
          'OAUTH_REDIRECT_URI',
          'OAUTH_URL',
          'MUX_API_URL',
          'SESSION_COOKIE_PASSWORD',
          'SENTRY_AUTH_TOKEN',
        ],
      },
      dev: {
        // Serves whatever generated content and package builds already exist. Depending on
        // the generators here would replay every workspace build task on each start, several
        // seconds even when fully cached, so the root `dev:site` script (`scripts/dev.ts`)
        // runs `dev:prepare` only when they are missing or explicitly requested.
        command: 'NETLIFY_DEV=1 astro dev',
        cache: false,
      },
      'dev:prepare': {
        command: 'node -e ""',
        cache: false,
        dependsOn: ['api-docs:generate', 'cdn-manifest'],
      },
      'test:ci': {
        command: 'pnpm test:coverage',
        cache: false,
        dependsOn: workspaceTaskDependencies(),
      },
    },
  },
};

export default getViteConfig(config, { root: fileURLToPath(new URL('.', import.meta.url)) });
