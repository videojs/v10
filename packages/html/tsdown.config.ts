import { globSync } from 'node:fs';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';

type BuildMode = 'dev' | 'default';

const buildModes: BuildMode[] = ['dev', 'default'];

const defineEntries = Object.fromEntries(
  globSync('src/define/**/*.ts').map((file) => {
    const key = file.replace('src/', '').replace('.ts', '');
    return [key, file];
  })
);

const createConfig = (mode: BuildMode): UserConfig => ({
  entry: {
    index: 'src/index.ts',
    ...defineEntries,
  },
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
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
