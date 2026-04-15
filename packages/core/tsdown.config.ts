import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import packageJson from './package.json' with { type: 'json' };

type BuildMode = 'dev' | 'default' | 'server';

const buildModes: BuildMode[] = ['dev', 'default', 'server'];

const isServer = (mode: BuildMode) => mode === 'server';

const mediaDirs = ['custom-media-element', 'dash', 'hls', 'mux', 'native-hls', 'simple-hls'];

const mediaEntry = (mode: BuildMode) =>
  Object.fromEntries(
    mediaDirs.map((dir) => [`dom/media/${dir}`, `./src/dom/media/${dir}/${isServer(mode) ? 'server' : 'browser'}.ts`])
  );

const createConfig = (mode: BuildMode): UserConfig => ({
  entry: {
    index: './src/core/index.ts',
    dom: './src/dom/index.ts',
    ...mediaEntry(mode),
  },
  platform: isServer(mode) ? 'node' : 'neutral',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  outExtensions: isServer(mode) ? () => ({ js: '.js', dts: '.d.ts' }) : undefined,
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
    __BROWSER__: isServer(mode) ? 'false' : 'true',
    __PLAYER_VERSION__: JSON.stringify(packageJson.version),
  },
  dts:
    mode === 'dev'
      ? {
          build: true,
          // Unified tsconfig covering both core and dom sources
          // so DOM lib types are available for dom subpath exports.
          tsconfig: 'tsconfig.dts.json',
        }
      : false,
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
