import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';

type BuildMode = 'dev' | 'default' | 'server';

const buildModes: BuildMode[] = ['dev', 'default', 'server'];

const isServer = (mode: BuildMode) => mode === 'server';

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

const createConfig = (mode: BuildMode): UserConfig => ({
  entry: 'src/**/index.{ts,tsx}',
  platform: isServer(mode) ? 'node' : 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  outExtensions: isServer(mode) ? () => ({ js: '.js', dts: '.d.ts' }) : undefined,
  noExternal: isServer(mode) ? [] : [/^@videojs\/skins/],
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
    __BROWSER__: isServer(mode) ? 'false' : 'true',
  },
  dts: mode === 'dev',
  plugins: isServer(mode) ? [] : [copyCssPlugin({ skinsDir, outDir: `dist/${mode}` })],
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
