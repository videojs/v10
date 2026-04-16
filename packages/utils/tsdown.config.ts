import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';

type BuildMode = 'default' | 'server';

const buildModes: BuildMode[] = ['default', 'server'];

const isServer = (mode: BuildMode) => mode === 'server';

const entries = {
  array: './src/array/index.ts',
  dom: './src/dom/index.ts',
  events: './src/events/index.ts',
  function: './src/function/index.ts',
  number: './src/number/index.ts',
  object: './src/object/index.ts',
  predicate: './src/predicate/index.ts',
  string: './src/string/index.ts',
  style: './src/style/index.ts',
  time: './src/time/index.ts',
  types: './src/types/index.ts',
};

const createConfig = (mode: BuildMode): UserConfig => ({
  entry: entries,
  platform: isServer(mode) ? 'node' : 'neutral',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  outExtensions: isServer(mode) ? () => ({ js: '.js', dts: '.d.ts' }) : undefined,
  outDir: isServer(mode) ? 'dist/server' : 'dist',
  define: {
    __BROWSER__: isServer(mode) ? 'false' : 'true',
  },
  dts: !isServer(mode),
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
