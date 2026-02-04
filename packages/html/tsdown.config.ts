import { globSync } from 'node:fs';
import type { Options } from 'tsdown';
import { defineConfig } from 'tsdown';

type BuildMode = 'dev' | 'prod' | 'types';

const buildModes: BuildMode[] = ['dev', 'prod', 'types'];

const defineEntries = Object.fromEntries(
  globSync('src/define/**/*.ts').map((file) => {
    const key = file.replace('src/', '').replace('.ts', '');
    return [key, file];
  })
);

const createConfig = (mode: BuildMode): Options => ({
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
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
  dts: mode === 'types',
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
