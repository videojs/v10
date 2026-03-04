import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.mjs';

type BuildMode = 'dev' | 'default';

const buildModes: BuildMode[] = ['dev', 'default'];

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

const createConfig = (mode: BuildMode): UserConfig => ({
  entry: 'src/**/index.{ts,tsx}',
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  noExternal: [/^@videojs\/skins/],
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
  dts: mode === 'dev',
  plugins: [copyCssPlugin({ skinsDir, outDir: `dist/${mode}` })],
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
