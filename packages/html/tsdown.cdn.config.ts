import { globSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { cdnI18nExternalPlugin } from '../../build/plugins/cdn-i18n-external-plugin.ts';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { inlineCssPlugin } from '../../build/plugins/inline-css-plugin.ts';
import { inlineTemplatePlugin } from '../../build/plugins/inline-template-plugin.ts';
import { baseConfig } from '../../build/tsdown.ts';

type BuildMode = 'dev' | 'prod';

const packageDir = dirname(fileURLToPath(import.meta.url));
const skinsDir = resolve(packageDir, '../skins/src');

/** The light-DOM sheet every non-background skin pulls in. Kept out of the shadow sheets. */
const globalCss = resolve(packageDir, 'src/define/global.css');

const buildModes: BuildMode[] = ['dev', 'prod'];

const presets = [
  'video',
  'video-player',
  'video-minimal',
  'video-ui',
  'video-minimal-ui',
  'audio',
  'audio-player',
  'audio-minimal',
  'audio-ui',
  'audio-minimal-ui',
  'live-video',
  'live-video-player',
  'live-video-minimal',
  'live-video-ui',
  'live-video-minimal-ui',
  'live-audio',
  'live-audio-player',
  'live-audio-minimal',
  'live-audio-ui',
  'live-audio-minimal-ui',
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
 * Flat CDN filename for a stylesheet, or null for a source file that is not published.
 *
 * A bundle inlines its own CSS and applies it on upgrade, so these files are not needed to run the
 * player. They exist for the two things a running element cannot do for a page:
 *
 * - **Light DOM, `<link>` in `<head>`.** `global.css` and `background.css` are what the elements
 *   inject into `document.head` themselves. Linking them instead applies the host and media box
 *   rules before the custom element upgrades, which is what stops the pre-upgrade layout shift.
 * - **Shadow DOM, `<link>` inside a `<template shadowrootmode>`.** `SkinElement` skips styling
 *   when a shadow root already exists, so a declaratively rendered skin has to carry its own
 *   sheet. Nothing is exposed through `::part`, so a document-level `<link>` cannot reach it.
 *
 * A tarball CDN serves paths and ignores `package.json` exports, so the filename *is* the public
 * URL. Shadow sheets are named after the bundle they pair with (`video.css` beside `video.js`),
 * which is what lets a page derive one URL from the other.
 *
 * Everything under `src/__generated__` is a Tailwind partial that the flattened skins already
 * inline, so it is skipped rather than published twice.
 */
function cdnStylesheetName(file: string): string | null {
  const match = /^src\/define\/(?:([\w-]+)\/)?([\w-]+)\.css$/.exec(file);
  if (!match) return null;

  const [, preset, name] = match;

  // Light DOM: `global.css`, and `shared.css` as a base for hand-written shadow skins.
  if (!preset) return `${name}.css`;

  // The background skin is light DOM only — its shadow root holds a bare container and no styles.
  if (preset === 'background') return name === 'skin' ? 'background.css' : null;

  if (name === 'skin') return `${preset}.css`;
  if (name === 'minimal-skin') return `${preset}-minimal.css`;

  return null;
}

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
      // Stylesheets have no dev/prod variant, so they are emitted once. The prod pass runs after
      // the dev pass, which is the one that cleans `outDir`.
      ...(isProd
        ? [
            copyCssPlugin({
              skinsDir,
              outDir,
              rename: cdnStylesheetName,
              // Skin sheets are for a shadow root, where the light-DOM rules are dead weight.
              // `global.css` ships on its own instead, for the `<head>`.
              omitImport: (imported) => imported === globalCss,
              minify: true,
            }),
          ]
        : []),
      ...(!isProd ? [dtsStubsPlugin(outDir)] : []),
    ],
    inputOptions: {
      ...baseConfig.inputOptions,
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
