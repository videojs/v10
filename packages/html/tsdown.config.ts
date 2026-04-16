import { globSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { inlineCssPlugin } from '../../build/plugins/inline-css-plugin.ts';
import { inlineTemplatePlugin } from '../../build/plugins/inline-template-plugin.ts';

type BuildMode = 'dev' | 'default' | 'server';

const buildModes: BuildMode[] = ['dev', 'default', 'server'];

const isServer = (mode: BuildMode) => mode === 'server';

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

/** Stub `*.css?inline` imports with empty strings for the server build. */
function stubCssInlinePlugin() {
  return {
    name: 'stub-css-inline',
    resolveId(source: string) {
      if (source.endsWith('.css?inline')) return { id: `\0stub-css:${source}`, external: false };
    },
    load(id: string) {
      if (id.startsWith('\0stub-css:')) return 'export default ""';
    },
  };
}

/** Stub all `define/*` modules with empty exports for the server build. */
function stubDefinePlugin() {
  const defineDir = resolve(dirname(fileURLToPath(import.meta.url)), 'src/define');
  return {
    name: 'stub-define',
    load(id: string) {
      if (id.startsWith(defineDir) && id !== defineDir) {
        return 'export {}';
      }
    },
  };
}

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
  platform: isServer(mode) ? 'node' : 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  outExtensions: isServer(mode) ? () => ({ js: '.js', dts: '.d.ts' }) : undefined,
  treeshake: {
    // The sideEffects field in package.json uses dist paths, but the build
    // runs against source. Ensure define/* modules (which register custom
    // elements as a side effect) are never tree-shaken from skin bundles.
    moduleSideEffects: [{ test: /\/define\//, sideEffects: true }],
  },
  noExternal: isServer(mode) ? [] : [/^@videojs\/icons/, /^@videojs\/skins/],
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
    __BROWSER__: isServer(mode) ? 'false' : 'true',
  },
  dts: mode === 'dev',
  plugins: isServer(mode)
    ? [stubCssInlinePlugin(), stubDefinePlugin()]
    : [
        copyCssPlugin({ skinsDir, outDir: `dist/${mode}` }),
        inlineCssPlugin({ skinsDir, minify: mode !== 'dev' }),
        inlineTemplatePlugin({ minify: mode !== 'dev' }),
      ],
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
