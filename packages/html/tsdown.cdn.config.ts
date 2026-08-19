import { globSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { cdnI18nExternalPlugin } from '../../build/plugins/cdn-i18n-external-plugin.ts';
import { inlineCssPlugin } from '../../build/plugins/inline-css-plugin.ts';
import { inlineTemplatePlugin } from '../../build/plugins/inline-template-plugin.ts';
import { baseConfig } from '../../build/tsdown.ts';

type BuildMode = 'dev' | 'prod';

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

const buildModes: BuildMode[] = ['dev', 'prod'];

const presets = [
  'video',
  'video-headless',
  'video-minimal',
  'video-ui',
  'video-minimal-ui',
  'live-video',
  'live-video-minimal',
  'audio',
  'audio-headless',
  'audio-minimal',
  'audio-ui',
  'audio-minimal-ui',
  'background',
];

const mediaDir = 'src/define/media';

/**
 * Media entries, one bundle per module under `src/define/media` — or per flavor,
 * for a module that is a directory.
 *
 * Discovered from the definitions so the two delivery surfaces cannot drift:
 * whatever ships on npm as `@videojs/html/media/<name>` also ships as
 * `cdn/media/<name>.js`, and as a file in the archive cut from this output.
 *
 * A directory ships its index as the flavor-neutral bundle and each flavor
 * beside it, so `media/mux-video/spf` reads the same as the npm subpath it
 * mirrors. The installation page derives CDN URLs from npm media subpaths, so
 * the two layouts matching is what keeps a flavor reachable there without a
 * translation step.
 *
 * A CDN page picks bundles at runtime rather than by import path, so this is
 * where two flavors of one element can end up in a single realm — see the
 * tag-collision note in `define/media/mux-video/spf`.
 */
const mediaEntries = readdirSync(mediaDir, { withFileTypes: true })
  .flatMap((entry) => {
    if (entry.isDirectory()) {
      return globSync(`${mediaDir}/${entry.name}/*.ts`).map((src) => {
        const flavor = basename(src, '.ts');
        return { src, name: flavor === 'index' ? `media/${entry.name}` : `media/${entry.name}/${flavor}` };
      });
    }

    return entry.name.endsWith('.ts')
      ? [{ src: `${mediaDir}/${entry.name}`, name: `media/${basename(entry.name, '.ts')}` }]
      : [];
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const localeEntries = globSync('src/cdn/locales/*.ts').map((file) => ({
  src: file,
  name: `locales/${basename(file, '.ts')}`,
}));

/**
 * Every CDN bundle the build emits, as `{ src, name }` where `name` is the output path without
 * its extension. Exported so the distribution archive can take its entry points from the build
 * definition rather than guessing which built files are entries and which are shared chunks.
 *
 * The `src` paths are relative to this package, so importers must run from the package root.
 */
export const entries = [
  { src: 'src/cdn/i18n.ts', name: 'i18n' },
  ...localeEntries,
  ...presets.map((name) => ({ src: `src/cdn/${name}.ts`, name })),
  ...mediaEntries,
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
    ...baseConfig,
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
      moduleSideEffects: [
        { test: /\/define\//, sideEffects: true },
        { test: /\/icons\/(?:dist\/)?element\//, sideEffects: true },
      ],
    },
    outDir,
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
    define: {
      __DEV__: isProd ? 'false' : 'true',
    },
    plugins: [
      cdnI18nExternalPlugin({ prod: isProd }),
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
