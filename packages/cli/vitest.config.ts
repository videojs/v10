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
      '@/consts': resolve(__dirname, '../../site/src/consts.ts'),
    },
  },
});
