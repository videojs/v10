import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/dom/index.ts', 'src/dom/playback-engine/index.ts'],
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  dts: true,
});
