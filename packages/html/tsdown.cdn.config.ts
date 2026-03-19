import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { inlineCssPlugin } from '../../build/plugins/inline-css-plugin.mjs';
import { inlineTemplatePlugin } from '../../build/plugins/inline-template-plugin.mjs';

type BuildMode = 'dev' | 'prod';

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

const buildModes: BuildMode[] = ['dev', 'prod'];

const presets = ['video', 'video-minimal', 'audio', 'audio-minimal', 'background'];
const media = ['hls-video', 'simple-hls-video', 'dash-video'];

const entries = [
  ...presets.map((name) => ({ src: `src/cdn/${name}.ts`, name })),
  ...media.map((name) => ({ src: `src/cdn/media/${name}.ts`, name: `media/${name}` })),
];

/**
 * One config per mode with all entries grouped together.
 * This lets rolldown extract shared modules (store, element, core, hls.js, etc.)
 * into shared chunks instead of duplicating them across every bundle.
 * The ES module loader handles chunk deduplication transparently.
 */
const configs: UserConfig[] = [];

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
    outDir: 'cdn',
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
    define: {
      __DEV__: isProd ? 'false' : 'true',
    },
    plugins: [inlineCssPlugin({ skinsDir, minify: isProd }), inlineTemplatePlugin({ minify: isProd })],
    inputOptions: !isProd
      ? {
          resolve: {
            conditionNames: ['development', 'import', 'browser', 'default'],
          },
        }
      : undefined,
  });
}

export default defineConfig(configs);
