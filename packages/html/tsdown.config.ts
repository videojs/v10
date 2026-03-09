import { globSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.mjs';
import { inlineCssPlugin } from '../../build/plugins/inline-css-plugin.mjs';

type BuildMode = 'dev' | 'default';

const buildModes: BuildMode[] = ['dev', 'default'];

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

const defineEntries = Object.fromEntries(
  globSync('src/define/**/*.ts')
    .filter((file) => !file.includes('.test.'))
    .map((file) => {
      const key = file.replace('src/', '').replace('.ts', '');
      return [key, file];
    })
);

const presetEntries = Object.fromEntries(
  globSync('src/presets/*.ts').map((file) => {
    const key = file.replace('src/', '').replace('.ts', '');
    return [key, file];
  })
);

const createConfig = (mode: BuildMode): UserConfig => ({
  entry: {
    index: 'src/index.ts',
    ...defineEntries,
    ...presetEntries,
  },
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  treeshake: {
    // The sideEffects field in package.json uses dist paths, but the build
    // runs against source. Ensure define/* modules (which register custom
    // elements as a side effect) are never tree-shaken from skin bundles.
    moduleSideEffects: [{ test: /\/define\//, sideEffects: true }],
  },
  noExternal: [/^@videojs\/icons/, /^@videojs\/skins/],
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
  dts: mode === 'dev',
  plugins: [copyCssPlugin({ skinsDir, outDir: `dist/${mode}` }), inlineCssPlugin({ skinsDir })],
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
