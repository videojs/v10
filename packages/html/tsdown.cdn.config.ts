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
const media = ['hls-video', 'simple-hls-video'];

const entries = [
  ...presets.map((name) => ({ src: `src/cdn/${name}.ts`, name })),
  ...media.map((name) => ({ src: `src/cdn/media/${name}.ts`, name: `media/${name}` })),
];

/**
 * One config per entry per mode → each output is fully self-contained.
 * Multiple entries in a single config causes rolldown to code-split shared
 * modules into chunks, which breaks the single-file CDN bundle requirement.
 */
const configs: UserConfig[] = [];

for (const mode of buildModes) {
  for (const { src, name } of entries) {
    const outName = mode === 'dev' ? `${name}.dev` : name;

    const isProd = mode === 'prod';

    configs.push({
      entry: { [outName]: src },
      platform: 'browser',
      format: 'es',
      target: 'es2022',
      sourcemap: true,
      clean: false,
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
      inputOptions:
        mode === 'dev'
          ? {
              resolve: {
                conditionNames: ['development', 'import', 'browser', 'default'],
              },
            }
          : undefined,
    });
  }
}

export default defineConfig(configs);
