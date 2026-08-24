import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { getViteConfig } from 'astro/config';
import type { ViteUserConfig } from 'vite-plus';

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
        dependsOn: [{ task: 'build', from: ['dependencies', 'devDependencies'] }],
        input: [
          { auto: true },
          '!*.tsbuildinfo',
          '!**/*.tsbuildinfo',
          // The API extractor has no sandbox inputs, but its workspace scan can
          // observe generated files that other builds create in parallel.
          { pattern: '!apps/sandbox/**', base: 'workspace' },
          { pattern: '!packages/cli/docs', base: 'workspace' },
          { pattern: '!packages/cli/docs/**', base: 'workspace' },
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
        dependsOn: [{ task: 'build', from: ['dependencies', 'devDependencies'] }],
        output: ['src/content/ejected-skins.json'],
      },
      'cdn-manifest': {
        command: 'tsx scripts/build-cdn-manifest.ts',
        dependsOn: [{ task: 'build:cdn', from: ['dependencies', 'devDependencies'] }],
        output: ['src/content/cdn-media.json'],
      },
      build: {
        command: 'astro build',
        dependsOn: ['api-docs:generate', 'ejected-skins', 'cdn-manifest'],
        // Astro regenerates and consumes collection schemas during one build.
        // They are tool-managed state rather than stable inputs or outputs.
        input: [{ auto: true }, '!*.tsbuildinfo', '!**/*.tsbuildinfo', '!.astro/**', '!.netlify/**'],
        output: [{ auto: true }, '!.astro/**', '!.netlify/**'],
        untrackedEnv: ['SHLVL'],
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
    },
  },
};

export default getViteConfig(config, { root: fileURLToPath(new URL('.', import.meta.url)) });
