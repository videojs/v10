import { globSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import {
  baseConfig,
  isDevBuildMode,
  type PackageBuildMode,
  packageBuildConfig,
  packageBuildModes,
} from '../../build/pack.ts';
import { cdnI18nExternalPlugin } from '../../build/plugins/cdn-i18n-external-plugin.ts';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { inlineCssPlugin } from '../../build/plugins/inline-css-plugin.ts';
import { inlineTemplatePlugin } from '../../build/plugins/inline-template-plugin.ts';
import { cachedTaskInputs, packageTestTask, workspaceTaskDependencies } from '../../build/task.ts';
import { LOCALES, localeAliases } from '../core/src/core/i18n/locales.ts';

type CdnBuildMode = 'dev' | 'prod';

const packageDir = dirname(fileURLToPath(import.meta.url));
const skinsDir = resolve(packageDir, '../skins/src');

/** The light-DOM sheet every non-background skin pulls in. Kept out of the shadow sheets. */
const globalCss = resolve(packageDir, 'src/define/global.css');

const srcDir = new URL('./src', import.meta.url).pathname;
const srcAlias = { '@': srcDir };
const localeTags = [...LOCALES, ...localeAliases(LOCALES)];

const defineEntries = Object.fromEntries(
  globSync('src/define/**/*.ts', { cwd: packageDir })
    .filter((file) => !file.includes('.test.'))
    .map((file) => {
      const key = file.replace('src/', '').replace('.ts', '');

      return [key, file];
    })
);

const presetEntries = Object.fromEntries(
  globSync('src/presets/*/index.ts', { cwd: packageDir }).map((file) => {
    const key = file.replace('src/', '').replace('.ts', '');

    return [key, file];
  })
);

const iconEntries = Object.fromEntries(
  globSync('src/icons/**/index.ts', { cwd: packageDir }).map((file) => {
    const key = file.replace('src/', '').replace('.ts', '');

    return [key, file];
  })
);

const i18nLocaleEntries = Object.fromEntries([
  ['i18n/locales/all', 'src/i18n/locales/all.ts'],
  ['i18n/locales/all/register', 'src/i18n/locales/all/register.ts'],
  ['i18n/locales/en', 'src/i18n/locales/en.ts'],
  ['i18n/locales/en/register', 'src/i18n/locales/en/register.ts'],
  ...localeTags.map((tag) => [`i18n/locales/${tag}`, `src/i18n/locales/${tag}.ts`]),
  ...localeTags.map((tag) => [`i18n/locales/${tag}/register`, `src/i18n/locales/${tag}/register.ts`]),
]);

const createPackConfig = (mode: PackageBuildMode): PackUserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  name: 'package',
  entry: {
    index: 'src/index.ts',
    'i18n/index': 'src/i18n/index.ts',
    ...i18nLocaleEntries,
    ...iconEntries,
    ...defineEntries,
    ...presetEntries,
  },
  treeshake: {
    // The sideEffects field in package.json uses dist paths, but the build
    // runs against source. Ensure define/* modules (which register custom
    // elements as a side effect) are never tree-shaken from skin bundles.
    moduleSideEffects: [
      { test: /\/define\//, sideEffects: true },
      { test: /\/icons\/(?:dist\/)?element\//, sideEffects: true },
      { test: /\/i18n\/locales\/.+\/register/, sideEffects: true },
    ],
  },
  deps: {
    alwaysBundle: [/^@videojs\/icons/, /^@videojs\/skins/],
  },
  alias: srcAlias,
  plugins: [
    copyCssPlugin({ skinsDir, outDir: `dist/${mode}` }),
    inlineCssPlugin({ skinsDir, minify: !isDevBuildMode(mode) }),
    inlineTemplatePlugin({ minify: !isDevBuildMode(mode) }),
  ],
});

const cdnBuildModes: CdnBuildMode[] = ['dev', 'prod'];
const cdnPresets = [
  'video',
  'video-player',
  'video-minimal',
  'live-video',
  'live-video-player',
  'live-video-minimal',
  'audio',
  'audio-player',
  'audio-minimal',
  'live-audio',
  'live-audio-player',
  'live-audio-minimal',
  'background',
];
const mediaDir = 'src/define/media';
const mediaDirPath = resolve(packageDir, mediaDir);

/**
 * Media entries, one bundle per module under `src/define/media` — or per flavor, for a module that is a directory.
 *
 * Discovered from the definitions so the npm and CDN delivery surfaces cannot drift. A directory ships its index as the
 * flavor-neutral bundle and each flavor beside it, so `media/mux-video/spf` reads the same as the npm subpath it
 * mirrors. The installation page derives CDN URLs from npm media subpaths, so the two layouts matching is what keeps a
 * flavor reachable there without a translation step.
 *
 * A CDN page picks bundles at runtime rather than by import path, so this is where two flavors of one element can end
 * up in a single realm — see the tag-collision note in `define/media/mux-video/spf`.
 */
const cdnMediaEntries = readdirSync(mediaDirPath, { withFileTypes: true })
  .flatMap((entry) => {
    if (entry.isDirectory()) {
      return globSync(`${mediaDir}/${entry.name}/*.ts`, { cwd: packageDir }).map((src) => {
        const flavor = basename(src, '.ts');

        return { src, name: flavor === 'index' ? `media/${entry.name}` : `media/${entry.name}/${flavor}` };
      });
    }

    return entry.name.endsWith('.ts')
      ? [{ src: `${mediaDir}/${entry.name}`, name: `media/${basename(entry.name, '.ts')}` }]
      : [];
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const cdnLocaleEntries = localeTags.map((tag) => ({
  src: `src/cdn/locales/${tag}.ts`,
  name: `locales/${tag}`,
}));

/**
 * Every CDN bundle the build emits, as `{ src, name }` where `name` is the output path without its extension. Exported
 * so the distribution archive can take its entry points from the build definition rather than guessing which built
 * files are entries and which are shared chunks.
 *
 * The `src` paths are relative to this package, so importers must run from the package root.
 */
export const entries = [
  { src: 'src/cdn/i18n.ts', name: 'i18n' },
  ...cdnLocaleEntries,
  ...cdnPresets.map((name) => ({ src: `src/cdn/${name}.ts`, name })),
  ...cdnMediaEntries,
];

/**
 * Flat CDN filename for a stylesheet, or null for a source file that is not published.
 *
 * A bundle inlines its own CSS and applies it on upgrade, so these files are not needed to run the player. They exist
 * for the two things a running element cannot do for a page:
 *
 * - **Light DOM, `<link>` in `<head>`.** `global.css` and `background.css` are what the elements inject into
 *   `document.head` themselves. Linking them instead applies the host and media box rules before the custom element
 *   upgrades, which is what stops the pre-upgrade layout shift.
 * - **Shadow DOM, `<link>` inside a `<template shadowrootmode>`.** `SkinElement` skips styling when a shadow root already
 *   exists, so a declaratively rendered skin has to carry its own sheet. Nothing is exposed through `::part`, so a
 *   document-level `<link>` cannot reach it.
 *
 * A tarball CDN serves paths and ignores `package.json` exports, so the filename _is_ the public URL. Shadow sheets are
 * named after the bundle they pair with (`video.css` beside `video.js`), which is what lets a page derive one URL from
 * the other.
 *
 * Everything under `src/__generated__` is an ejected-skin partial that the flattened skins already inline, so it is
 * skipped rather than published twice.
 */
function cdnStylesheetName(file: string): string | null {
  const match = /^src\/define\/(?:([\w-]+)\/)?([\w-]+)\.css$/.exec(file);
  if (!match) return null;

  const [, preset, name] = match;
  // Light DOM: `global.css`, and `shared.css` as a base for hand-written shadow skins.
  if (!preset) return `${name}.css`;

  // The background skin is light DOM only — its shadow root holds a bare container and no styles.
  if (preset === 'background') return name === 'skin' ? 'background.css' : null;

  const suffix = name === 'skin' ? '' : name === 'minimal-skin' ? '-minimal' : null;
  if (suffix === null) return null;

  return `${preset}${suffix}.css`;
}

/** Generate empty declaration stubs for side-effect-only dev CDN entries. */
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

/** Group CDN entries by mode so Rolldown can extract shared chunks. */
const cdnPackConfigs: PackUserConfig[] = [];
const cdnOutDir = 'cdn';

for (const mode of cdnBuildModes) {
  const isProd = mode === 'prod';
  const entryMap = Object.fromEntries(entries.map(({ src, name }) => [isProd ? name : `${name}.dev`, src]));

  cdnPackConfigs.push({
    ...baseConfig,
    name: 'cdn',
    entry: entryMap,
    platform: 'browser',
    format: 'es',
    target: 'es2022',
    sourcemap: true,
    clean: mode === 'dev',
    dts: false,
    minify: isProd,
    deps: {
      alwaysBundle: [/.*/],
      onlyBundle: false,
    },
    treeshake: {
      moduleSideEffects: [
        { test: /\/define\//, sideEffects: true },
        { test: /\/icons\/(?:dist\/)?element\//, sideEffects: true },
      ],
    },
    outDir: cdnOutDir,
    alias: srcAlias,
    define: {
      __DEV__: isProd ? 'false' : 'true',
    },
    plugins: [
      cdnI18nExternalPlugin({ prod: isProd }),
      inlineCssPlugin({ skinsDir, minify: isProd }),
      inlineTemplatePlugin({ minify: isProd }),
      // Stylesheets have no dev/prod variant, so they are emitted once. The prod pass runs after the dev pass, which
      // is the one that cleans `outDir`.
      ...(isProd
        ? [
            copyCssPlugin({
              skinsDir,
              outDir: cdnOutDir,
              rename: cdnStylesheetName,
              // Skin sheets are for a shadow root, where the light-DOM rules are dead weight. `global.css` ships on
              // its own instead, for the `<head>`.
              omitImport: (imported) => imported === globalCss,
              minify: true,
            }),
          ]
        : []),
      ...(!isProd ? [dtsStubsPlugin(cdnOutDir)] : []),
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

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: 'vp pack --filter package',
        dependsOn: workspaceTaskDependencies(),
        // CDN sources are consumed only by build:cdn. Pack config discovery
        // observes their parent directory even when filtering to `package`, so
        // keep the independent npm package build free of that generated tree.
        input: [...cachedTaskInputs, '!src/cdn/', '!src/cdn/**'],
        output: ['dist/**'],
      },
      'build:cdn': {
        command: 'node --import tsx ./scripts/build-cdn-locales.ts && vp pack --filter cdn',
        dependsOn: ['build'],
        // Both related Pack configs share this output directory, so Pack may
        // inspect files emitted by the other config. They remain outputs only.
        input: [...cachedTaskInputs, '!src/cdn/locales/', '!src/cdn/locales/**', '!cdn/', '!cdn/**'],
        output: ['src/cdn/locales/**', 'cdn/**'],
      },
      'test:ci': packageTestTask(),
    },
  },
  define: {
    __DEV__: 'true',
  },
  resolve: {
    // These tests run in a simulated browser, but Vitest transforms through the SSR pipeline, where `browser`
    // is not a resolve condition. Without it a dependency that answers `browser` separately — `@videojs/media`
    // does, for the medias whose engine has a server build — hands its server stand-in to a happy-dom suite.
    conditions: ['browser', 'development', 'module', 'import', 'default'],
  },
  test: {
    passWithNoTests: true,
    onConsoleLog: (log) => !log.includes('Lit is in dev mode'),
    environment: 'happy-dom',
    // Dynamic composite imports can exceed Vitest's default under workspace load.
    testTimeout: 15_000,
  },
  pack: [...packageBuildModes.map(createPackConfig), ...cdnPackConfigs],
});
