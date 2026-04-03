import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { inlineCssPlugin } from '../../build/plugins/inline-css-plugin.ts';
import { inlineTemplatePlugin } from '../../build/plugins/inline-template-plugin.ts';

type BuildMode = 'dev' | 'prod';

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

const buildModes: BuildMode[] = ['dev', 'prod'];

const presets = [
  'video',
  'video-minimal',
  'video-ui',
  'video-minimal-ui',
  'audio',
  'audio-minimal',
  'audio-ui',
  'audio-minimal-ui',
  'background',
];
const media = ['hls-video', 'mux-video', 'native-hls-video', 'simple-hls-video', 'dash-video'];

const entries = [
  ...presets.map((name) => ({ src: `src/cdn/${name}.ts`, name })),
  ...media.map((name) => ({ src: `src/cdn/media/${name}.ts`, name: `media/${name}` })),
];

/**
 * Rolldown plugin that generates empty `.d.ts` stubs for dev CDN entry points.
 * CDN entries are side-effect-only modules with no exports — the stubs let
 * TypeScript resolve `import '@videojs/html/cdn/...'` without errors.
 */
function dtsStubsPlugin(outDir: string) {
  function generate(dir: string) {
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      if (file.isDirectory()) {
        generate(resolve(dir, file.name));
      } else if (file.name.endsWith('.dev.js') && !file.name.endsWith('.dev.js.map')) {
        writeFileSync(resolve(dir, file.name.replace('.dev.js', '.dev.d.ts')), 'export {};\n');
      }
    }
  }

  return {
    name: 'cdn-dts-stubs',
    writeBundle() {
      generate(outDir);
    },
  };
}

/**
 * One config per mode with all entries grouped together.
 * This lets rolldown extract shared modules (store, element, core, hls.js, etc.)
 * into shared chunks instead of duplicating them across every bundle.
 * The ES module loader handles chunk deduplication transparently.
 */
const configs: UserConfig[] = [];

const outDir = 'cdn';

for (const mode of buildModes) {
  const isProd = mode === 'prod';

  const entryMap = Object.fromEntries(entries.map(({ src, name }) => [isProd ? name : `${name}.dev`, src]));

  configs.push({
    entry: entryMap,
    platform: 'browser',
    format: 'es',
    target: 'es2022',
    sourcemap: true,
    clean: mode === 'dev',
    dts: false,
    minify: isProd,
    noExternal: [/.*/],
    inlineOnly: false,
    treeshake: {
      moduleSideEffects: [{ test: /\/define\//, sideEffects: true }],
    },
    outDir,
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
    define: {
      __DEV__: isProd ? 'false' : 'true',
    },
    plugins: [
      inlineCssPlugin({ skinsDir, minify: isProd }),
      inlineTemplatePlugin({ minify: isProd }),
      ...(!isProd ? [dtsStubsPlugin(outDir)] : []),
    ],
    inputOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === 'COMMONJS_VARIABLE_IN_ESM') return;
        defaultHandler(warning);
      },
      ...(!isProd && {
        resolve: {
          conditionNames: ['development', 'import', 'browser', 'default'],
        },
      }),
    },
  });
}

export default defineConfig(configs);
