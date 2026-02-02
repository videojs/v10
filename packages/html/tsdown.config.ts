import { globSync } from 'node:fs';
import { defineConfig } from 'tsdown';

const defineEntries = Object.fromEntries(
  globSync('src/define/**/*.ts').map((file) => {
    const key = file.replace('src/', '').replace('.ts', '');
    return [key, file];
  })
);

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ...defineEntries,
  },
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  dts: true,
});
