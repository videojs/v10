import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vite-plus/test';

import {
  addTag,
  collectImports,
  collectPageCoverage,
  type Coverage,
  documentedStability,
  findDeclarations,
  findSourceDeclarations,
  findUnstableImports,
  fixSourceFile,
  isCoveredName,
  matchesModulePattern,
  missingTag,
  parseFrontmatter,
} from '../check-api-stability.ts';

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

function tag(source: string, name: string, tagName = 'internal'): string {
  const sourceFile = ts.createSourceFile('file.ts', source, ts.ScriptTarget.Latest, true);

  return addTag(source, sourceFile, findDeclarations(sourceFile, name)[0]!, tagName);
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
});

describe('missingTag', () => {
  it('accepts stronger tags for internal exports', () => {
    expect(missingTag({ tags: new Set() }, 'internal')).toBe('internal');
    expect(missingTag({ tags: new Set(['experimental']) }, 'internal')).toBeUndefined();
    expect(missingTag({ tags: new Set(['deprecated']) }, 'internal')).toBeUndefined();
  });

  it('requires @experimental for exports documented on unstable pages', () => {
    expect(missingTag({ tags: new Set(['internal']) }, 'experimental')).toBe('experimental');
    expect(missingTag({ tags: new Set(['experimental']) }, 'experimental')).toBeUndefined();
    expect(missingTag({ tags: new Set() }, 'stable')).toBeUndefined();
  });
});

describe('addTag', () => {
  it('creates a JSDoc block when the declaration has none', () => {
    expect(tag('export function foo() {}\n', 'foo')).toBe('/** @internal */\nexport function foo() {}\n');
  });

  it('expands a single-line comment and separates the tag from the description', () => {
    expect(tag('/** Does foo. */\nexport const foo = 1;\n', 'foo')).toBe(
      '/**\n * Does foo.\n *\n * @internal\n */\nexport const foo = 1;\n'
    );
  });

  it('appends after existing tags and keeps indentation', () => {
    expect(tag('/** @example x */\nexport type Foo = 1;\n', 'Foo', 'experimental')).toBe(
      '/**\n * @example x\n * @experimental\n */\nexport type Foo = 1;\n'
    );
    expect(tag('class A {}\n  /**\n   * Does foo.\n   *   indented\n   */\n  export const foo = 1;\n', 'foo')).toBe(
      'class A {}\n  /**\n   * Does foo.\n   *   indented\n   *\n   * @internal\n   */\n  export const foo = 1;\n'
    );
  });

  it('tags a default export', () => {
    expect(tag("export default { a: 'b' };\n", 'default')).toBe("/** @internal */\nexport default { a: 'b' };\n");
  });
});

describe('fixSourceFile', () => {
  it('tags every overload of a function', () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-stability-'));
    const file = join(directory, 'overloads.ts');

    writeFileSync(file, '/** One. */\nexport function foo(): void;\nexport function foo(a?: number): void {}\n');

    expect(fixSourceFile(file, new Map([['foo', 'internal']]))).toBe(2);
    expect(readFileSync(file, 'utf8')).toBe(
      '/**\n * One.\n *\n * @internal\n */\nexport function foo(): void;\n/** @internal */\nexport function foo(a?: number): void {}\n'
    );

    rmSync(directory, { recursive: true });
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
