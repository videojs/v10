import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vite-plus/test';

import {
  buildPackageFields,
  GENERATED_HEADER,
  type HtmlPackageJson,
  renderHtmlEntry,
  resolveHtmlModules,
  rewriteHtmlDistPath,
} from '../html-entries.ts';

const html: HtmlPackageJson = {
  main: 'dist/default/index.js',
  module: 'dist/default/index.js',
  types: 'dist/dev/index.d.ts',
  sideEffects: ['./dist/*/define/**/*.js'],
  exports: {
    './package.json': './package.json',
    '.': {
      types: './dist/dev/index.d.ts',
      development: './dist/dev/index.js',
      default: './dist/default/index.js',
    },
    './video': {
      types: './dist/dev/presets/video/index.d.ts',
      development: './dist/dev/presets/video/index.js',
      default: './dist/default/presets/video/index.js',
    },
    './video/*.css': './dist/default/define/video/*.css',
    './video/*': {
      types: './dist/dev/define/video/*.d.ts',
      development: './dist/dev/define/video/*.js',
      default: './dist/default/define/video/*.js',
    },
    './icons/*': {
      types: './dist/dev/icons/*/index.d.ts',
      development: './dist/dev/icons/*/index.js',
      default: './dist/default/icons/*/index.js',
    },
    './i18n/locales/*': {
      types: './dist/dev/i18n/locales/*.d.ts',
      development: './dist/dev/i18n/locales/*.js',
      default: './dist/default/i18n/locales/*.js',
    },
    './*': {
      types: './dist/dev/define/*.d.ts',
      development: './dist/dev/define/*.js',
      default: './dist/default/define/*.js',
    },
  },
  peerDependencies: { '@videojs/hlsjs-video': 'workspace:*' },
  peerDependenciesMeta: { '@videojs/hlsjs-video': { optional: true } },
};

describe('rewriteHtmlDistPath', () => {
  it('moves dist paths under the html subtree', () => {
    expect(rewriteHtmlDistPath('./dist/dev/define/video/*.js')).toBe('./dist/dev/html/define/video/*.js');
    expect(rewriteHtmlDistPath('./dist/default/index.js')).toBe('./dist/default/html/index.js');
    expect(rewriteHtmlDistPath('./dist/*/define/**/*.js')).toBe('./dist/*/html/define/**/*.js');
  });

  it('leaves non-dist paths alone', () => {
    expect(rewriteHtmlDistPath('./package.json')).toBe('./package.json');
  });
});

describe('buildPackageFields', () => {
  const fields = buildPackageFields(html);

  it('lists the package-owned exports first', () => {
    expect(Object.keys(fields.exports).slice(0, 4)).toEqual(['./package.json', '.', './errors', './dist/video-js.css']);
  });

  it('keeps the root entry hand-written so it can carry the v8 stubs', () => {
    expect(fields.exports['.']).toEqual({
      types: './dist/dev/index.d.ts',
      development: './dist/dev/index.js',
      default: './dist/default/index.js',
    });
    expect(fields.main).toBe('dist/default/index.js');
    expect(fields.module).toBe('dist/default/index.js');
    expect(fields.types).toBe('dist/dev/index.d.ts');
  });

  it('mirrors every other html export under the html subtree', () => {
    expect(fields.exports['./video']).toEqual({
      types: './dist/dev/html/presets/video/index.d.ts',
      development: './dist/dev/html/presets/video/index.js',
      default: './dist/default/html/presets/video/index.js',
    });
    expect(fields.exports['./video/*.css']).toBe('./dist/default/html/define/video/*.css');
    expect(fields.exports['./*']).toEqual({
      types: './dist/dev/html/define/*.d.ts',
      development: './dist/dev/html/define/*.js',
      default: './dist/default/html/define/*.js',
    });
  });

  it('mirrors side effects and peers', () => {
    expect(fields.sideEffects).toEqual(['./dist/*/html/define/**/*.js']);
    expect(fields.peerDependencies).toEqual(html.peerDependencies);
    expect(fields.peerDependenciesMeta).toEqual(html.peerDependenciesMeta);
  });
});

describe('resolveHtmlModules', () => {
  let srcDir: string;

  const write = (file: string, content = 'export const x = 1;\n') => {
    const full = join(srcDir, file);

    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  };

  afterEach(() => {
    rmSync(srcDir, { recursive: true, force: true });
  });

  it('pairs every reachable module with its most specific specifier, skipping package-owned entries', () => {
    srcDir = mkdtempSync(join(tmpdir(), 'v8-html-'));
    write('index.ts');
    write('presets/video/index.ts');
    write('presets/video/player.ts');
    write('define/video/player.ts', '');
    write('define/ui/play-button.ts', '');
    write('define/media/mux-video/index.ts', '');
    write('icons/element/register/index.ts');
    write('i18n/locales/en.ts', "export { default } from '@videojs/core/i18n/locales/en';\n");
    write('i18n/locales/en/register.ts', '');
    write('define/video/player.test.ts');
    write('define/tests/helpers.ts');

    const modules = resolveHtmlModules(srcDir, html.exports);

    expect(modules.map((module) => [module.modulePath, module.specifier])).toEqual([
      ['define/media/mux-video/index', '@videojs/html/media/mux-video/index'],
      ['define/ui/play-button', '@videojs/html/ui/play-button'],
      ['define/video/player', '@videojs/html/video/player'],
      ['i18n/locales/en', '@videojs/html/i18n/locales/en'],
      ['i18n/locales/en/register', '@videojs/html/i18n/locales/en/register'],
      ['icons/element/register/index', '@videojs/html/icons/element/register'],
      ['presets/video/index', '@videojs/html/video'],
    ]);
  });

  it('detects default and side-effect-only modules', () => {
    srcDir = mkdtempSync(join(tmpdir(), 'v8-html-'));
    write('i18n/locales/en.ts', "export { default } from '@videojs/core/i18n/locales/en';\n");
    write(
      'define/video/player.ts',
      'safeDefine(PlayerElement);\n\ndeclare global {\n  interface HTMLElementTagNameMap {}\n}\n'
    );
    write('define/video/skin.ts', "export { VideoSkinElement } from '../../skin';\n");

    const modules = resolveHtmlModules(srcDir, html.exports);
    const byPath = Object.fromEntries(
      modules.map((module) => [module.modulePath, [module.hasExports, module.hasDefault]])
    );

    expect(byPath).toEqual({
      'i18n/locales/en': [true, true],
      'define/video/player': [false, false],
      'define/video/skin': [true, false],
    });
  });
});

describe('renderHtmlEntry', () => {
  it('re-exports the specifier', () => {
    expect(
      renderHtmlEntry({
        modulePath: 'define/video/skin',
        specifier: '@videojs/html/video/skin',
        hasExports: true,
        hasDefault: false,
      })
    ).toBe(`${GENERATED_HEADER}export * from '@videojs/html/video/skin';\n`);
  });

  it('imports side-effect-only modules so registration runs and global augmentations flow', () => {
    expect(
      renderHtmlEntry({
        modulePath: 'define/video/player',
        specifier: '@videojs/html/video/player',
        hasExports: false,
        hasDefault: false,
      })
    ).toBe(`${GENERATED_HEADER}import '@videojs/html/video/player';\n`);
  });

  it('forwards a default export separately', () => {
    expect(
      renderHtmlEntry({
        modulePath: 'i18n/locales/en',
        specifier: '@videojs/html/i18n/locales/en',
        hasExports: true,
        hasDefault: true,
      })
    ).toBe(
      `${GENERATED_HEADER}export * from '@videojs/html/i18n/locales/en';\nexport { default } from '@videojs/html/i18n/locales/en';\n`
    );
  });
});
