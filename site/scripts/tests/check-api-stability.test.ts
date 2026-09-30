import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import {
  applyTagChange,
  collectImports,
  collectPackageEntries,
  collectPageCoverage,
  collectPublicExports,
  type Coverage,
  documentedStability,
  findDeclarations,
  findInternalReferences,
  findSourceDeclarations,
  findUnstableImports,
  fixSourceFile,
  isCoveredName,
  matchesModulePattern,
  parseFrontmatter,
  type PublicExport,
  type Stability,
  type TagChange,
  tagChange,
  tagViolation,
} from '../check-api-stability.ts';

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

/** Write `files` under a fresh temporary root laid out like the monorepo (`packages/<pkg>/{dist,src}`). */
function fixture(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'api-stability-')));

  directories.push(root);

  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }

  return root;
}

function exportsOf(root: string, entries: Record<string, string>): PublicExport[] {
  const publicEntries = Object.entries(entries).map(([specifier, path]) => ({
    specifier,
    declarationFile: join(root, path),
  }));

  return collectPublicExports(publicEntries, root).exports;
}

function byName(records: readonly PublicExport[], name: string): PublicExport {
  const record = records.find((candidate) => candidate.name === name);
  if (!record) throw new Error(`No export named ${name}`);

  return record;
}

function page(frontmatter: string, body = ''): string {
  return `---\n${frontmatter}\n---\n${body}`;
}

function coverage(overrides: Partial<Coverage> = {}): Coverage {
  return { stable: new Set(), unstable: new Set(), stableModules: [], unstableModules: [], ...overrides };
}

function record(name: string, options: { exportedNames?: string[]; specifiers?: string[] } = {}) {
  return {
    name,
    exportedNames: new Set(options.exportedNames ?? [name]),
    specifiers: new Set(options.specifiers ?? ['@videojs/react']),
  };
}

function edit(source: string, name: string, change: TagChange): string {
  const sourceFile = ts.createSourceFile('file.ts', source, ts.ScriptTarget.Latest, true);

  return applyTagChange(source, sourceFile, findDeclarations(sourceFile, name)[0]!, change);
}

function tag(source: string, name: string, tagName: 'internal' | 'experimental' = 'internal'): string {
  return edit(source, name, { add: tagName, remove: [] });
}

describe('parseFrontmatter', () => {
  it('reads block and inline apis lists', () => {
    expect(parseFrontmatter(page('title: Video preset\napis:\n  - videoFeatures\n  - "VideoFeatures"')).apis).toEqual([
      'videoFeatures',
      'VideoFeatures',
    ]);
    expect(parseFrontmatter(page("apis: [selectTime, '@videojs/react/i18n/locales/*']")).apis).toEqual([
      'selectTime',
      '@videojs/react/i18n/locales/*',
    ]);
  });

  it('reads nested frameworkTitle values and stability', () => {
    const frontmatter = parseFrontmatter(
      page('title: PlayButton\nframeworkTitle:\n  html: media-play-button\nstability: unstable')
    );

    expect(frontmatter.title).toBe('PlayButton');
    expect(frontmatter.frameworkTitle).toEqual(['media-play-button']);
    expect(frontmatter.stability).toBe('unstable');
  });
});

describe('collectPageCoverage', () => {
  it('covers the subject from the title, framework title, and doc component props', () => {
    const { names } = collectPageCoverage(
      page(
        'title: PlayButton\nframeworkTitle:\n  html: media-play-button',
        '<ComponentImports component="PlayButton" html={["play-button", "play-button-icon"]} />'
      )
    );

    expect([...names]).toEqual(expect.arrayContaining(['PlayButton', 'PlayButtonIcon']));
  });

  it('covers parts written against a subject, including nested parts', () => {
    const { names } = collectPageCoverage(
      page('title: Slider', '```tsx\n<Slider.Thumbnail.Root />\n<Other.Part />\n```')
    );

    expect(names).toContain('SliderThumbnail');
    expect(names).toContain('SliderThumbnailRoot');
    expect(names).not.toContain('OtherPart');
  });

  it('covers selectors only on feature pages', () => {
    const body = 'Pass `selectVolume` to `usePlayer`.';

    expect(
      collectPageCoverage(page('title: Volume', `<FeatureReference feature="volume" />\n${body}`)).names
    ).toContain('selectVolume');
    expect(collectPageCoverage(page('title: usePlayer', body)).names).not.toContain('selectVolume');
  });

  it('ignores names that only appear in prose or example code', () => {
    const { names } = collectPageCoverage(
      page('title: usePlayer', 'Use a helper.\n\n```ts\nimport { helper } from "x";\n```')
    );

    expect(names).not.toContain('helper');
  });

  it('splits apis into names and module patterns and reports unstable pages', () => {
    const result = collectPageCoverage(
      page("title: Locales\nstability: unstable\napis: [Locale, '@videojs/html/i18n/locales/*']")
    );

    expect(result.names).toContain('Locale');
    expect(result.modules).toEqual(['@videojs/html/i18n/locales/*']);
    expect(result.unstable).toBe(true);
  });
});

describe('isCoveredName', () => {
  const covered = new Set(['PlayButton', 'useHotkey', 'useQualityOptions']);

  it('matches subjects and their companion types', () => {
    expect(isCoveredName('PlayButton', covered)).toBe(true);
    expect(isCoveredName('PlayButtonProps', covered)).toBe(true);
    expect(isCoveredName('PlayButtonElement', covered)).toBe(true);
  });

  it('matches hook companions by case and `use` prefix', () => {
    expect(isCoveredName('UseHotkeyOptions', covered)).toBe(true);
    expect(isCoveredName('QualityOptionsResult', covered)).toBe(true);
  });

  it('does not match unrelated names, a bare `use` prefix, or a differently cased name', () => {
    expect(isCoveredName('PlayButtonCore', covered)).toBe(false);
    expect(isCoveredName('Hotkey', covered)).toBe(false);
    expect(isCoveredName('UseHotkey', covered)).toBe(false);
  });
});

describe('matchesModulePattern', () => {
  it('matches one path segment per wildcard', () => {
    expect(matchesModulePattern('@videojs/react/i18n/locales/ja', ['@videojs/react/i18n/locales/*'])).toBe(true);
    expect(matchesModulePattern('@videojs/react/i18n/locales/ja/register', ['@videojs/react/i18n/locales/*'])).toBe(
      false
    );
  });
});

describe('documentedStability', () => {
  it('prefers stable coverage over unstable coverage', () => {
    const docs = coverage({ stable: new Set(['Video']), unstable: new Set(['Video', 'DashVideo']) });

    expect(documentedStability(record('VideoProps'), docs)).toBe('stable');
    expect(documentedStability(record('DashVideo'), docs)).toBe('experimental');
    expect(documentedStability(record('createButton'), docs)).toBe('internal');
  });

  it('covers an export under any of its public names', () => {
    const docs = coverage({ stable: new Set(['AudioTrackRadioGroup']) });

    expect(
      documentedStability(record('AudioTrackRadioGroupLegacy', { exportedNames: ['AudioTrackRadioGroup'] }), docs)
    ).toBe('stable');
  });

  it('covers default exports by module pattern', () => {
    const docs = coverage({ stableModules: ['@videojs/react/i18n/locales/*'] });

    expect(documentedStability(record('default', { specifiers: ['@videojs/react/i18n/locales/ja'] }), docs)).toBe(
      'stable'
    );
    expect(documentedStability(record('default', { specifiers: ['@videojs/core/vjsc'] }), docs)).toBe('internal');
  });

  it('keeps exports only internal packages expose internal, whatever their name', () => {
    const docs = coverage({ stable: new Set(['PlayButton', 'Video']), stableModules: ['@videojs/core/*'] });

    expect(documentedStability(record('PlayButtonState', { specifiers: ['@videojs/core'] }), docs)).toBe('internal');
    expect(documentedStability(record('Video', { specifiers: ['@videojs/media', '@videojs/core/dom'] }), docs)).toBe(
      'internal'
    );
    expect(documentedStability(record('default', { specifiers: ['@videojs/core/vjsc'] }), docs)).toBe('internal');
    expect(
      documentedStability(record('PlayButtonState', { specifiers: ['@videojs/core', '@videojs/react'] }), docs)
    ).toBe('stable');
  });

  it('matches a documented name across framework-facing packages', () => {
    const docs = coverage({ stable: new Set(['PlayButton']) });

    expect(documentedStability(record('PlayButton', { specifiers: ['@videojs/html'] }), docs)).toBe('stable');
    expect(documentedStability(record('PlayButtonProps', { specifiers: ['@videojs/react'] }), docs)).toBe('stable');
    expect(documentedStability(record('PlayButton', { specifiers: ['@videojs/element'] }), docs)).toBe('internal');
  });
});

describe('tagChange', () => {
  it('accepts stronger tags for internal exports', () => {
    expect(tagChange(new Set(), 'internal')).toEqual({ add: 'internal', remove: [] });
    expect(tagChange(new Set(['experimental']), 'internal')).toBeUndefined();
    expect(tagChange(new Set(['deprecated']), 'internal')).toBeUndefined();
  });

  it('replaces @internal with @experimental for exports documented on unstable pages', () => {
    expect(tagChange(new Set(['internal']), 'experimental')).toEqual({ add: 'experimental', remove: ['internal'] });
    expect(tagChange(new Set(['internal', 'experimental']), 'experimental')).toEqual({ remove: ['internal'] });
    expect(tagChange(new Set(['experimental']), 'experimental')).toBeUndefined();
  });

  it('removes tags that contradict a stable page', () => {
    expect(tagChange(new Set(), 'stable')).toBeUndefined();
    expect(tagChange(new Set(['deprecated']), 'stable')).toBeUndefined();
    expect(tagChange(new Set(['internal', 'experimental']), 'stable')).toEqual({
      remove: ['internal', 'experimental'],
    });
  });
});

describe('tagViolation', () => {
  it('explains a missing tag, including on only some declarations', () => {
    expect(tagViolation({ declarationTags: [new Set()] }, 'internal')).toBe('needs @internal');
    expect(tagViolation({ declarationTags: [new Set(['internal']), new Set()] }, 'internal')).toBe(
      'needs @internal on 1 of 2 declarations'
    );
    expect(tagViolation({ declarationTags: [new Set(['internal'])] }, 'internal')).toBeUndefined();
  });

  it('reports a tag that contradicts the page', () => {
    expect(tagViolation({ declarationTags: [new Set(['internal'])] }, 'stable')).toBe(
      'is documented on a reference page but tagged @internal — remove the tag'
    );
    expect(tagViolation({ declarationTags: [new Set(['internal'])] }, 'experimental')).toBe(
      'is documented on an unstable page but tagged @internal — use @experimental'
    );
  });
});

describe('applyTagChange', () => {
  it('creates a JSDoc block when the declaration has none', () => {
    expect(tag('export function foo() {}\n', 'foo')).toBe('/** @internal */\nexport function foo() {}\n');
  });

  it('expands a single-line comment and separates the tag from the description', () => {
    expect(tag('/** Does foo. */\nexport const foo = 1;\n', 'foo')).toBe(
      '/**\n * Does foo.\n *\n * @internal\n */\nexport const foo = 1;\n'
    );
  });

  it('appends after existing tags and keeps indentation', () => {
    expect(tag('/** @param a - A. */\nexport function foo(a: number) {}\n', 'foo', 'experimental')).toBe(
      '/**\n * @param a - A.\n * @experimental\n */\nexport function foo(a: number) {}\n'
    );
    expect(tag('class A {}\n  /**\n   * Does foo.\n   *   indented\n   */\n  export const foo = 1;\n', 'foo')).toBe(
      'class A {}\n  /**\n   * Does foo.\n   *   indented\n   *\n   * @internal\n   */\n  export const foo = 1;\n'
    );
  });

  it('inserts where the formatter keeps the tag: after an @example block and before @see', () => {
    const example = '/**\n * Does foo.\n *\n * @example\n *   ```ts\n *   @decorator foo();\n *   ```\n */\n';

    expect(tag(`${example}export const foo = 1;\n`, 'foo')).toBe(
      '/**\n * Does foo.\n *\n * @example\n *   ```ts\n *   @decorator foo();\n *   ```\n *\n * @internal\n */\nexport const foo = 1;\n'
    );
    expect(
      tag('/**\n * Does foo.\n *\n * @param a - A.\n * @see bar\n */\nexport function foo(a: number) {}\n', 'foo')
    ).toBe(
      '/**\n * Does foo.\n *\n * @param a - A.\n * @internal\n * @see bar\n */\nexport function foo(a: number) {}\n'
    );
  });

  it('tags a default export', () => {
    expect(tag("export default { a: 'b' };\n", 'default')).toBe("/** @internal */\nexport default { a: 'b' };\n");
  });

  it('removes a tag, deleting a comment it leaves empty and collapsing one that fits a line', () => {
    const remove: TagChange = { remove: ['internal'] };

    expect(edit('/** @internal */\nexport const foo = 1;\n', 'foo', remove)).toBe('export const foo = 1;\n');
    expect(edit('/**\n * Does foo.\n *\n * @internal\n */\nexport const foo = 1;\n', 'foo', remove)).toBe(
      '/** Does foo. */\nexport const foo = 1;\n'
    );
    expect(
      edit(
        '/**\n * Does foo.\n *\n * @internal\n * @param a - A.\n */\nexport function foo(a: number) {}\n',
        'foo',
        remove
      )
    ).toBe('/**\n * Does foo.\n *\n * @param a - A.\n */\nexport function foo(a: number) {}\n');
  });

  it('keeps the text a removed tag carried as the description', () => {
    expect(
      edit('/** @internal Adapter for presets. */\nexport const foo = 1;\n', 'foo', { remove: ['internal'] })
    ).toBe('/** Adapter for presets. */\nexport const foo = 1;\n');
  });

  it('replaces @internal with @experimental in place', () => {
    expect(
      edit('/**\n * Does foo.\n *\n * @internal\n * @see bar\n */\nexport const foo = 1;\n', 'foo', {
        add: 'experimental',
        remove: ['internal'],
      })
    ).toBe('/**\n * Does foo.\n *\n * @experimental\n * @see bar\n */\nexport const foo = 1;\n');
  });
});

describe('findDeclarations', () => {
  it('finds the declaration behind `export default x`', () => {
    const sourceFile = ts.createSourceFile(
      'file.ts',
      '/** Messages. */\nconst messages = {};\n\nexport default messages;\n',
      ts.ScriptTarget.Latest,
      true
    );
    const [declaration] = findDeclarations(sourceFile, 'default');

    expect(declaration && ts.isVariableStatement(declaration)).toBe(true);
  });
});

describe('fixSourceFile', () => {
  function fix(source: string, fixes: Record<string, Stability>): string {
    const file = join(fixture({ 'file.ts': source }), 'file.ts');

    fixSourceFile(file, new Map(Object.entries(fixes)));

    return readFileSync(file, 'utf8');
  }

  it('tags every overload of a function', () => {
    const file = join(
      fixture({
        'overloads.ts': '/** One. */\nexport function foo(): void;\nexport function foo(a?: number): void {}\n',
      }),
      'overloads.ts'
    );

    expect(fixSourceFile(file, new Map([['foo', 'internal']]))).toBe(2);
    expect(readFileSync(file, 'utf8')).toBe(
      '/**\n * One.\n *\n * @internal\n */\nexport function foo(): void;\n/** @internal */\nexport function foo(a?: number): void {}\n'
    );
  });

  it('tags each untagged declaration of a merged name', () => {
    expect(fix('/** @internal */\nexport const Foo = 1;\nexport interface Foo {}\n', { Foo: 'internal' })).toBe(
      '/** @internal */\nexport const Foo = 1;\n/** @internal */\nexport interface Foo {}\n'
    );
  });

  it('removes a tag from a documented export and replaces it on an unstable one', () => {
    expect(
      fix('/** @internal */\nexport const foo = 1;\n\n/** @internal */\nexport const bar = 1;\n', {
        foo: 'stable',
        bar: 'experimental',
      })
    ).toBe('export const foo = 1;\n\n/** @experimental */\nexport const bar = 1;\n');
  });
});

describe('findSourceDeclarations', () => {
  const root = join(import.meta.dirname, '..', '..', '..');

  it('maps a built declaration that mirrors src', () => {
    const declarations = findSourceDeclarations(
      join(root, 'packages/utils/dist/object/shallow-equal.d.ts'),
      'shallowEqual'
    );

    expect(declarations?.file).toBe(join(root, 'packages/utils/src/object/shallow-equal.ts'));
  });

  it('finds the authored module behind a renamed or bundled entry', () => {
    expect(findSourceDeclarations(join(root, 'packages/core/dist/dev/i18n/text/airplay.d.ts'), 'startText')?.file).toBe(
      join(root, 'packages/core/src/core/i18n/text/airplay.ts')
    );
    expect(
      findSourceDeclarations(
        join(root, 'packages/adapters/mux-video/dist/dev/mux/dist/dev/source.d.ts'),
        'MuxDrmParams'
      )?.file
    ).toBe(join(root, 'packages/adapters/mux/src/source.ts'));
  });
});

describe('collectPackageEntries', () => {
  it('expands wildcard exports to one entry per declaration file and skips private packages', () => {
    const root = fixture({
      'pkg/package.json': JSON.stringify({
        name: '@videojs/pkg',
        exports: {
          '.': { types: './dist/index.d.ts' },
          './ui/*': { types: './dist/ui/*/index.d.ts' },
          './styles.css': './dist/styles.css',
        },
      }),
      'pkg/dist/index.d.ts': '',
      'pkg/dist/ui/play-button/index.d.ts': '',
      'pkg/dist/ui/play-button/parts.d.ts': '',
      'pkg/dist/ui/time/index.d.ts': '',
      'private/package.json': JSON.stringify({ name: '@videojs/private', private: true, exports: { '.': './a.d.ts' } }),
    });

    expect(collectPackageEntries(join(root, 'pkg'))).toEqual([
      { specifier: '@videojs/pkg', declarationFile: join(root, 'pkg/dist/index.d.ts') },
      { specifier: '@videojs/pkg/ui/play-button', declarationFile: join(root, 'pkg/dist/ui/play-button/index.d.ts') },
      { specifier: '@videojs/pkg/ui/time', declarationFile: join(root, 'pkg/dist/ui/time/index.d.ts') },
    ]);
    expect(collectPackageEntries(join(root, 'private'))).toEqual([]);
  });
});

describe('collectPublicExports', () => {
  it('records renamed exports under their source name, with bundler `_default` and `$1` names undone', () => {
    const root = fixture({
      'packages/react/dist/index.d.ts': [
        "export { Foo as Bar } from './foo.js';",
        'interface IconProps$1 { size: number }',
        'declare const _default: { hello: string };',
        'export { IconProps$1 as IconProps, _default as default };',
      ].join('\n'),
      'packages/react/dist/foo.d.ts': 'export declare const Foo: number;\n',
      'packages/react/src/foo.ts': '/** @internal */\nexport const Foo = 1;\n',
      'packages/react/src/index.ts':
        "/** @internal */\nexport interface IconProps { size: number }\n\n/** @internal */\nexport default { hello: 'x' };\n",
    });
    const exports = exportsOf(root, { '@videojs/react': 'packages/react/dist/index.d.ts' });

    expect(byName(exports, 'Foo')).toMatchObject({
      exportedNames: new Set(['Bar']),
      file: join(root, 'packages/react/src/foo.ts'),
      hasSource: true,
      declarationTags: [new Set(['internal'])],
    });
    expect(byName(exports, 'IconProps').file).toBe(join(root, 'packages/react/src/index.ts'));
    expect(byName(exports, 'default')).toMatchObject({ hasSource: true, declarationTags: [new Set(['internal'])] });
  });

  it('checks namespace members under flattened part names and merges them with direct exports', () => {
    const root = fixture({
      'packages/react/dist/slider.parts.d.ts': [
        'declare function SliderBuffer(): void;',
        'declare namespace slider_parts_d_exports {',
        '  export { SliderBuffer as Buffer };',
        '}',
        'export { SliderBuffer as Buffer, slider_parts_d_exports };',
      ].join('\n'),
      'packages/react/dist/features.d.ts': 'export declare const pipFeature: { name: string };\n',
      'packages/react/dist/feature.parts.d.ts': "export { pipFeature as pip } from './features.js';\n",
      'packages/react/dist/index.d.ts': [
        "import { slider_parts_d_exports } from './slider.parts.js';",
        "export * as features from './feature.parts.js';",
        "export { pipFeature } from './features.js';",
        'export { slider_parts_d_exports as Slider };',
      ].join('\n'),
      'packages/html/dist/thumb.d.ts': 'export declare function SliderThumb(): void;\n',
      'packages/html/dist/parts.d.ts': "export { SliderThumb as Thumb } from './thumb.js';\n",
      'packages/html/dist/index.d.ts': "export * as Slider from './parts.js';\n",
    });
    const exports = exportsOf(root, {
      '@videojs/react': 'packages/react/dist/index.d.ts',
      '@videojs/react/slider-parts': 'packages/react/dist/slider.parts.d.ts',
      '@videojs/html': 'packages/html/dist/index.d.ts',
    });

    expect(exports.map((entry) => entry.name).sort()).toEqual(['SliderBuffer', 'SliderThumb', 'pipFeature']);
    expect(byName(exports, 'SliderBuffer').exportedNames).toEqual(new Set(['SliderBuffer', 'Buffer']));
    expect(byName(exports, 'SliderThumb').exportedNames).toEqual(new Set(['SliderThumb']));
    expect(byName(exports, 'pipFeature').exportedNames).toEqual(new Set(['features.pip', 'pipFeature']));
  });

  it('keeps the tags of each merged declaration and ignores an overload implementation', () => {
    const root = fixture({
      'packages/react/dist/index.d.ts': [
        'export declare const Player: Player;',
        'export interface Player { a: number }',
        'export declare function load(): void;',
        'export declare function load(a: number): void;',
      ].join('\n'),
      'packages/react/src/index.ts': [
        '/** @internal */',
        'export const Player = { a: 1 };',
        'export interface Player { a: number }',
        '/** @internal */',
        'export function load(): void;',
        '/** @internal */',
        'export function load(a: number): void;',
        'export function load(a?: number): void {}',
      ].join('\n'),
    });
    const exports = exportsOf(root, { '@videojs/react': 'packages/react/dist/index.d.ts' });

    expect(tagViolation(byName(exports, 'Player'), 'internal')).toBe('needs @internal on 1 of 2 declarations');
    expect(tagViolation(byName(exports, 'load'), 'internal')).toBeUndefined();
  });

  it('reports exports that resolve to no declaration', () => {
    const root = fixture({
      'packages/react/dist/index.d.ts': "export { Missing } from 'not-installed';\nexport declare const a: number;\n",
    });
    const surface = collectPublicExports(
      [{ specifier: '@videojs/react', declarationFile: join(root, 'packages/react/dist/index.d.ts') }],
      root
    );

    expect(surface.unresolved).toEqual(['@videojs/react#Missing']);
    expect(surface.exports.map((entry) => entry.name)).toEqual(['a']);
  });
});

describe('findInternalReferences', () => {
  const root = fixture({
    'packages/core/dist/index.d.ts': [
      'export interface CoreState { paused: boolean }',
      'export interface CoreOptions { label: string }',
      'export declare namespace ButtonCore { export type Props = { disabled: boolean } }',
    ].join('\n'),
    'packages/react/dist/index.d.ts': [
      "import { ButtonCore, CoreOptions, CoreState } from '../../core/dist/index.js';",
      // Like bundled output: `export {}` stops a declaration file exporting every top-level declaration.
      'export {};',
      'interface Helper { state: CoreState }',
      'export interface PlayButtonProps extends ButtonCore.Props { state: CoreState }',
      'export interface PlayButtonState extends Helper {}',
      'export declare class PlayButtonElement {',
      '  private secret: CoreState;',
      '  protected guarded: CoreState;',
      '  /** @internal */',
      '  hidden: CoreState;',
      '  state: PlayButtonState;',
      '}',
      'export declare function usePlayButton(options: CoreOptions): PlayButtonState;',
    ].join('\n'),
  });
  const exports = exportsOf(root, {
    '@videojs/core': 'packages/core/dist/index.d.ts',
    '@videojs/react': 'packages/react/dist/index.d.ts',
  });
  const docs = coverage({ stable: new Set(['PlayButton', 'usePlayButton', 'CoreState']) });
  const stabilities = new Map(exports.map((entry) => [entry, documentedStability(entry, docs)]));
  const references = findInternalReferences(exports, stabilities).map(
    ({ record, reference }) => `${record.name} -> ${reference.name}`
  );

  it('reports documented exports whose public surface names an internal export', () => {
    expect(references.sort()).toEqual([
      'PlayButtonProps -> ButtonCore',
      'PlayButtonProps -> CoreState',
      'usePlayButton -> CoreOptions',
    ]);
  });

  it('ignores hidden members, non-exported helpers, and stable references', () => {
    expect(references.filter((reference) => /^PlayButton(?:Element|State) /.test(reference))).toEqual([]);
    expect(stabilities.get(byName(exports, 'CoreState'))).toBe('internal');
  });
});

describe('collectImports', () => {
  it('collects named, default, and dynamic imports from @videojs packages', () => {
    const imports = collectImports(
      [
        "import { PlayButton, type PlayButtonProps as Props } from '@videojs/react';",
        "import de from '@videojs/react/i18n/locales/de';",
        "const ja = () => import('@videojs/react/i18n/locales/ja');",
        "import '@videojs/html/ui/play-button';",
        "import { clsx } from 'clsx';",
      ].join('\n'),
      'page.mdx'
    );

    expect(imports.map(({ name, specifier }) => `${specifier}#${name}`)).toEqual([
      '@videojs/react#PlayButton',
      '@videojs/react#PlayButtonProps',
      '@videojs/react/i18n/locales/de#default',
      '@videojs/react/i18n/locales/ja#default',
    ]);
  });
});

describe('findUnstableImports', () => {
  it('flags internal packages and exports that are not stable', () => {
    const stabilities = new Map([
      ['@videojs/react#PlayButton', 'stable' as const],
      ['@videojs/react#usePlayerContext', 'internal' as const],
    ]);
    const warnings = findUnstableImports(
      [
        { file: 'a.mdx', name: 'PlayButton', specifier: '@videojs/react' },
        { file: 'a.mdx', name: 'usePlayerContext', specifier: '@videojs/react' },
        { file: 'a.mdx', name: 'formatTime', specifier: '@videojs/utils/time' },
      ],
      stabilities
    );

    expect(warnings.map(({ name, reason }) => `${name}: ${reason}`)).toEqual([
      'usePlayerContext: internal',
      'formatTime: internal package',
    ]);
  });
});
