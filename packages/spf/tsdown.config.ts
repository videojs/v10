import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  dts: true,
});
