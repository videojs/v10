import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import { baseConfig } from '../../build/pack.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  define: {
    __CLI_VERSION__: JSON.stringify('0.0.0-test'),
  },
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@/utils/installation/codegen': resolve(__dirname, '../../site/src/utils/installation/codegen.ts'),
      '@/utils/installation/types': resolve(__dirname, '../../site/src/utils/installation/types.ts'),
      '@/utils/installation/cdn-code': resolve(__dirname, '../../site/src/utils/installation/cdn-code.ts'),
      '@/utils/installation/detect-renderer': resolve(
        __dirname,
        '../../site/src/utils/installation/detect-renderer.ts'
      ),
      '@/utils/installation/renderer-options': resolve(
        __dirname,
        '../../site/src/utils/installation/renderer-options.ts'
      ),
      // The real manifest is generated at build time (gitignored) and bundled
      // by Vite+ pack. CLI tests are intentionally hermetic (`test` has no task-runner
      // build dependency), so they resolve a committed fixture that mirrors the
      // manifest's shape and contents instead of forcing a CDN build.
      '@/content/cdn-media.json': resolve(__dirname, 'src/utils/tests/fixtures/cdn-media.json'),
      '@/consts': resolve(__dirname, '../../site/src/consts.ts'),
    },
  },
  pack: {
    ...baseConfig,
    entry: { index: './src/index.ts' },
    platform: 'node',
    format: 'es',
    clean: true,
    banner: { js: '#!/usr/bin/env node' },
    deps: { alwaysBundle: ['site'] },
    define: {
      __CLI_VERSION__: JSON.stringify(pkg.version),
    },
    alias: {
      '@/utils/installation/codegen': resolve(__dirname, '../../site/src/utils/installation/codegen.ts'),
      '@/utils/installation/types': resolve(__dirname, '../../site/src/utils/installation/types.ts'),
      '@/utils/installation/cdn-code': resolve(__dirname, '../../site/src/utils/installation/cdn-code.ts'),
      '@/utils/installation/detect-renderer': resolve(
        __dirname,
        '../../site/src/utils/installation/detect-renderer.ts'
      ),
      '@/utils/installation/renderer-options': resolve(
        __dirname,
        '../../site/src/utils/installation/renderer-options.ts'
      ),
      '@/content/cdn-media.json': resolve(__dirname, '../../site/src/content/cdn-media.json'),
      '@/consts': resolve(__dirname, '../../site/src/consts.ts'),
    },
  },
});
