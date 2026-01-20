import { defineConfig } from 'tsdown';

// const defineDir = new URL('./src/define', import.meta.url).pathname;
// const defineFiles = readdirSync(defineDir).filter(file => file.endsWith('.ts'));

export default defineConfig({
  entry: {
    index: 'src/index.ts',
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
