import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

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
      // by tsdown. CLI tests are intentionally hermetic (`test` has no turbo
      // build dependency), so they resolve a committed fixture that mirrors the
      // manifest's shape and contents instead of forcing a CDN build.
      '@/content/cdn-media.json': resolve(__dirname, 'src/utils/tests/fixtures/cdn-media.json'),
      '@/consts': resolve(__dirname, '../../site/src/consts.ts'),
    },
  },
});
