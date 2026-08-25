import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { getViteConfig } from 'astro/config';
import type { ViteUserConfig } from 'vite-plus';

import { cachedTaskInputs, cachedTaskOutputs, workspaceTaskDependencies } from '../build/task.ts';
import { demoPlaceholderPlugin } from './scripts/replace-demo-placeholders.ts';

// Typed as Vite+'s `ViteUserConfig` (Vite's config augmented with `test`) and
// passed as a variable: Astro 7's `getViteConfig` param no longer surfaces the
// Vite+ module augmentation, so a fresh object literal trips an excess-property
// check on `test`. A variable is only checked for structural assignability.
const config: ViteUserConfig = {
  plugins: [demoPlaceholderPlugin(), react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/utils/**', 'src/components/**', 'src/types/**', 'scripts/api-docs-builder/src/**'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/test/**'],
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
          { pattern: 'packages/{core,html,media,react,spf,utils}/package.json', base: 'workspace' },
          { pattern: 'packages/{core,html,media,react,spf,utils}/src/**', base: 'workspace' },
          { pattern: '!packages/**/*.tsbuildinfo', base: 'workspace' },
          { pattern: '!packages/html/src/cdn/locales', base: 'workspace' },
          { pattern: '!packages/html/src/cdn/locales/**', base: 'workspace' },
        ],
        output: [
          'src/content/generated-component-reference/**',
          'src/content/generated-util-reference/**',
          'src/content/generated-feature-reference/**',
          'src/content/generated-media-reference/**',
          'src/content/generated-preset-reference/**',
        ],
      },
      'ejected-skins': {
        command: 'tsx scripts/build-ejected-skins.ts',
        dependsOn: workspaceTaskDependencies(),
        input: cachedTaskInputs,
        output: ['src/content/ejected-skins.json'],
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
        dependsOn: ['api-docs:generate', 'ejected-skins', 'cdn-manifest'],
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
        command: 'NETLIFY_DEV=1 astro dev',
        cache: false,
        dependsOn: ['api-docs:generate', 'ejected-skins', 'cdn-manifest'],
      },
      'test:ci': {
        command: 'pnpm test',
        cache: false,
        dependsOn: workspaceTaskDependencies(),
      },
    },
  },
};

export default getViteConfig(config, { root: fileURLToPath(new URL('.', import.meta.url)) });
