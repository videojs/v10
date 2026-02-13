import { globSync } from 'node:fs';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';

type BuildMode = 'dev' | 'default';

const buildModes: BuildMode[] = ['dev', 'default'];

const presetsEntries = Object.fromEntries(
  globSync('src/presets/**/*.{ts,tsx}').map((file) => {
    const key = file.replace('src/', '').replace(/\.tsx?$/, '');
    return [key, file];
  })
);

const createConfig = (mode: BuildMode): UserConfig => ({
  entry: {
    index: './src/index.ts',
    ...presetsEntries,
  },
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
  dts: mode === 'dev',
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
