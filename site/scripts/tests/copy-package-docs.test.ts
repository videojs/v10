import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vite-plus/test';

import {
  getInstallationRoutePath,
  INSTALLATION_ROUTES,
  INSTALLATION_ROUTE_SEGMENTS,
} from '../../src/utils/installation/routes.ts';
import {
  type Framework,
  packageDocumentation,
  rewriteIndexHeader,
  rewriteLinks,
  stripFooter,
  synthesizeReadme,
} from '../copy-package-docs.ts';

const temporaryDirectories: string[] = [];

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'package-docs-'));

  temporaryDirectories.push(root);
  return {
    root,
    siteDist: join(root, 'site-dist'),
    packagesDirectory: join(root, 'packages'),
  };
}

function writeDoc(siteDist: string, framework: Framework, relativePath: string, content: string): void {
  const path = join(siteDist, 'docs', 'framework', framework, relativePath);

  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content);
}

function writeInstallationDocs(siteDist: string, framework: Framework): number {
  const routes = INSTALLATION_ROUTE_SEGMENTS.filter((route) =>
    INSTALLATION_ROUTES[route].frameworks.some((candidate) => candidate === framework)
  );

  for (const route of routes) {
    const path = join(siteDist, `${getInstallationRoutePath(route).slice(1)}.md`);

    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, `# ${route} installation`);
  }

  return routes.length;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('stripFooter', () => {
  it('removes a page-style breadcrumb footer', () => {
    const input = [
      '# Installation',
      '',
      'Body content.',
      '',
      '---',
      '',
      'React documentation: https://videojs.org/docs/framework/react/llms.txt',
      'All documentation: https://videojs.org/llms.txt',
      '',
    ].join('\n');

    expect(stripFooter(input)).toBe(['# Installation', '', 'Body content.'].join('\n'));
  });

  it('removes an index-style breadcrumb footer (no framework line)', () => {
    const input = ['# Index', '- entry', '', '---', '', 'All documentation: https://videojs.org/llms.txt', ''].join(
      '\n'
    );

    expect(stripFooter(input)).toBe(['# Index', '- entry'].join('\n'));
  });

  it('removes every framework line from a multi-framework page footer', () => {
    const input = [
      '# Shadcn Installation Guide',
      '',
      'Body content.',
      '',
      '---',
      '',
      'React documentation: https://videojs.org/docs/framework/react/llms.txt',
      'HTML documentation: https://videojs.org/docs/framework/html/llms.txt',
      'All documentation: https://videojs.org/llms.txt',
      '',
    ].join('\n');

    expect(stripFooter(input)).toBe(['# Shadcn Installation Guide', '', 'Body content.'].join('\n'));
  });

  it('leaves content without a footer unchanged', () => {
    const input = '# Heading\n\nBody.';

    expect(stripFooter(input)).toBe(input);
  });
});

describe('rewriteLinks', () => {
  it('rewrites an absolute same-framework .md link to a relative path', () => {
    const input = '- [Installation](https://videojs.org/docs/framework/react/guides/installation.md): desc';

    expect(rewriteLinks(input, 'llms', 'react')).toBe('- [Installation](./guides/installation.md): desc');
  });

  it('rewrites canonical installation links to their bundled guide paths', () => {
    const input = [
      '[Packaged](https://videojs.org/docs/guides/installation/react.md)',
      '[Shadcn](/docs/guides/installation/shadcn)',
    ].join('\n');

    expect(rewriteLinks(input, 'llms', 'react')).toBe(
      ['[Packaged](./guides/installation.md)', '[Shadcn](./guides/installation-shadcn.md)'].join('\n')
    );
  });

  it('rewrites a root-relative same-framework link with a trailing slash', () => {
    const input = 'See [Play Button](/docs/framework/react/components/play-button/) for details.';

    expect(rewriteLinks(input, 'concepts/overview', 'react')).toBe(
      'See [Play Button](../components/play-button.md) for details.'
    );
  });

  it('rewrites a sibling-page link from inside a subdirectory', () => {
    const input = '[Skins](https://videojs.org/docs/framework/html/concepts/skins.md)';

    expect(rewriteLinks(input, 'concepts/overview', 'html')).toBe('[Skins](./skins.md)');
  });

  it('preserves a fragment when rewriting', () => {
    const input = '[Section](https://videojs.org/docs/framework/react/components/play-button.md#props)';

    expect(rewriteLinks(input, 'llms', 'react')).toBe('[Section](./components/play-button.md#props)');
  });

  it('does not touch links to a different framework', () => {
    const input = '[HTML docs](https://videojs.org/docs/framework/html/guides/installation.md)';

    expect(rewriteLinks(input, 'llms', 'react')).toBe(input);
  });

  it('does not touch links to non-docs site pages', () => {
    const input = 'See the [blog](https://videojs.org/blog/post.md) for context.';

    expect(rewriteLinks(input, 'llms', 'react')).toBe(input);
  });

  it('preserves the .txt extension when rewriting a link to llms.txt', () => {
    const input = '[index](https://videojs.org/docs/framework/react/llms.txt)';

    expect(rewriteLinks(input, 'guides/build-with-ai', 'react')).toBe('[index](../llms.txt)');
  });

  it('leaves bare framework-root URLs alone (empty slug)', () => {
    const input = '[Docs](https://videojs.org/docs/framework/react/)';

    expect(rewriteLinks(input, 'guides/build-with-ai', 'react')).toBe(input);
  });

  it('does not rewrite URLs that appear inside link text (e.g. code spans)', () => {
    // The link text contains a URL-shaped string inside backticks; only the
    // target inside `(...)` should be rewritten.
    const input = '[`videojs.org/docs/framework/react/llms.txt`](https://videojs.org/docs/framework/react/llms.txt)';

    expect(rewriteLinks(input, 'guides/build-with-ai', 'react')).toBe(
      '[`videojs.org/docs/framework/react/llms.txt`](../llms.txt)'
    );
  });
});

describe('rewriteIndexHeader', () => {
  const webIndex =
    '# Video.js v10 — HTML Documentation\n\n' +
    '> Every page below is also available as Markdown at its `.md` URL. The whole set in one file (about 240k tokens): https://videojs.org/docs/framework/html/llms-full.txt\n\n' +
    '## Guides\n\n' +
    'Section index: [guides/llms.txt](https://videojs.org/docs/framework/html/guides/llms.txt). This section in one file (about 90k tokens): https://videojs.org/docs/framework/html/guides/llms-full.txt\n';

  it('names the package and version and drops the unbundled complete files', () => {
    expect(rewriteIndexHeader(webIndex, { framework: 'html', version: '10.0.0-test' })).toBe(
      '# Video.js v10 — HTML Documentation\n\n' +
        '> Bundled with `@videojs/html` v10.0.0-test. Links are relative paths to files in this directory.\n\n' +
        '## Guides\n\n' +
        'Section index: [guides/llms.txt](https://videojs.org/docs/framework/html/guides/llms.txt).\n'
    );
  });

  it('keeps a section description ahead of the package context and omits an unknown version', () => {
    const section =
      '# Guides\n\n> Guides for Video.js. Every page below is also available as Markdown at its `.md` URL. This section in one file (about 98k tokens): https://videojs.org/docs/framework/html/guides/llms-full.txt\n';

    expect(rewriteIndexHeader(section, { framework: 'html', version: undefined })).toBe(
      '# Guides\n\n> Guides for Video.js. Bundled with `@videojs/html`. Links are relative paths to files in this directory.\n'
    );
  });
});

describe('synthesizeReadme', () => {
  it('renders the react cold-start file with a version', () => {
    const out = synthesizeReadme({ framework: 'react', version: '10.0.0-beta.23' });

    expect(out).toContain('# @videojs/react documentation');
    expect(out).toContain('Bundled markdown documentation for `@videojs/react` v10.0.0-beta.23.');
    expect(out).toContain('Start at [`./llms.txt`](./llms.txt)');
    expect(out).toContain('Canonical online version: https://videojs.org/docs/framework/react');
  });

  it('renders the html cold-start file', () => {
    const out = synthesizeReadme({ framework: 'html', version: '10.0.0-beta.23' });

    expect(out).toContain('# @videojs/html documentation');
    expect(out).toContain('Canonical online version: https://videojs.org/docs/framework/html');
  });

  it('omits the version suffix when version is unknown', () => {
    const out = synthesizeReadme({ framework: 'react', version: undefined });

    expect(out).toContain('Bundled markdown documentation for `@videojs/react`.');
    expect(out).not.toContain('undefined');
  });

  it('throws on an unsupported framework', () => {
    expect(() =>
      synthesizeReadme({
        framework: 'svelte' as unknown as Framework,
        version: '1.0.0',
      })
    ).toThrow();
  });
});

describe('packageDocumentation', () => {
  const footer =
    '\n\n---\n\nReact documentation: https://videojs.org/docs/framework/react/llms.txt\nAll documentation: https://videojs.org/llms.txt\n';

  it('packages framework docs with local links and a README', () => {
    const fixture = createFixture();
    const installationCount = writeInstallationDocs(fixture.siteDist, 'react');

    writeDoc(
      fixture.siteDist,
      'react',
      'concepts/overview.md',
      `[Install](https://videojs.org/docs/framework/react/guides/installation.md)${footer}`
    );

    expect(
      packageDocumentation({
        target: 'react',
        siteDist: fixture.siteDist,
        packagesDirectory: fixture.packagesDirectory,
        version: '10.0.0-test',
      })
    ).toBe(1 + installationCount);
    expect(readFileSync(join(fixture.packagesDirectory, 'react/docs/concepts/overview.md'), 'utf-8')).toBe(
      '[Install](../guides/installation.md)'
    );
    expect(readFileSync(join(fixture.packagesDirectory, 'react/docs/README.md'), 'utf-8')).toContain('v10.0.0-test');
  });

  it('places canonical installation Markdown at the package guide paths', () => {
    const fixture = createFixture();
    const installationCount = writeInstallationDocs(fixture.siteDist, 'react');

    writeDoc(fixture.siteDist, 'react', 'llms.txt', '[Install](/docs/guides/installation/react.md)');
    const installation = join(fixture.siteDist, 'docs/guides/installation/react.md');

    writeFileSync(installation, '# React Installation Guide');

    expect(
      packageDocumentation({
        target: 'react',
        siteDist: fixture.siteDist,
        packagesDirectory: fixture.packagesDirectory,
      })
    ).toBe(1 + installationCount);
    expect(readFileSync(join(fixture.packagesDirectory, 'react/docs/guides/installation.md'), 'utf-8')).toBe(
      '# React Installation Guide'
    );
    expect(readFileSync(join(fixture.packagesDirectory, 'react/docs/llms.txt'), 'utf-8')).toBe(
      '[Install](./guides/installation.md)'
    );
  });

  it('bundles pages and indexes but no complete files', () => {
    const fixture = createFixture();

    writeInstallationDocs(fixture.siteDist, 'html');
    writeDoc(
      fixture.siteDist,
      'html',
      'llms.txt',
      '# Docs\n\n> Every page below is also available as Markdown at its `.md` URL. The whole set in one file: https://videojs.org/docs/framework/html/llms-full.txt\n'
    );
    writeDoc(fixture.siteDist, 'html', 'llms-full.txt', '# Docs\n\n> Header\n');
    writeDoc(
      fixture.siteDist,
      'html',
      'guides/llms.txt',
      '# Guides\n\n> Every page below is also available as Markdown at its `.md` URL. This section in one file (about 9k tokens): https://videojs.org/docs/framework/html/guides/llms-full.txt\n'
    );
    writeDoc(fixture.siteDist, 'html', 'guides/llms-full.txt', '# Guides\n\n> Header\n');

    packageDocumentation({
      target: 'html',
      siteDist: fixture.siteDist,
      packagesDirectory: fixture.packagesDirectory,
      version: '10.0.0-test',
    });

    expect(readFileSync(join(fixture.packagesDirectory, 'html/docs/llms.txt'), 'utf-8')).toBe(
      '# Docs\n\n> Bundled with `@videojs/html` v10.0.0-test. Links are relative paths to files in this directory.\n'
    );
    expect(readFileSync(join(fixture.packagesDirectory, 'html/docs/guides/llms.txt'), 'utf-8')).toBe(
      '# Guides\n\n> Bundled with `@videojs/html` v10.0.0-test. Links are relative paths to files in this directory.\n'
    );
    expect(existsSync(join(fixture.packagesDirectory, 'html/docs/llms-full.txt'))).toBe(false);
    expect(existsSync(join(fixture.packagesDirectory, 'html/docs/guides/llms-full.txt'))).toBe(false);
  });

  it("keeps only the package's branch of the Shadcn guide and links it locally", () => {
    const fixture = createFixture();

    writeInstallationDocs(fixture.siteDist, 'html');
    writeDoc(fixture.siteDist, 'html', 'llms.txt', '# Docs');
    writeFileSync(
      join(fixture.siteDist, 'docs/guides/installation/shadcn.md'),
      [
        '# Shadcn',
        '<!-- cli:framework react -->',
        'React steps',
        '<!-- /cli:framework react -->',
        '<!-- cli:framework html -->',
        'HTML steps',
        '<!-- /cli:framework html -->',
      ].join('\n\n')
    );
    writeFileSync(
      join(fixture.siteDist, 'docs/guides/installation/vue.md'),
      '[Shadcn](https://videojs.org/docs/guides/installation/shadcn?framework=html) or [React](https://videojs.org/docs/guides/installation/shadcn?framework=react)'
    );

    packageDocumentation({ target: 'html', siteDist: fixture.siteDist, packagesDirectory: fixture.packagesDirectory });

    const guides = join(fixture.packagesDirectory, 'html/docs/guides');

    expect(readFileSync(join(guides, 'installation-shadcn.md'), 'utf-8')).toBe('# Shadcn\n\nHTML steps\n');
    expect(readFileSync(join(guides, 'installation-vue.md'), 'utf-8')).toBe(
      '[Shadcn](./installation-shadcn.md) or [React](https://videojs.org/docs/guides/installation/shadcn?framework=react)'
    );
  });

  it('packages both CLI frameworks while preserving online links', () => {
    const fixture = createFixture();
    const link = '[Install](https://videojs.org/docs/framework/react/guides/installation.md)';
    const installationCount =
      writeInstallationDocs(fixture.siteDist, 'react') + writeInstallationDocs(fixture.siteDist, 'html');

    writeDoc(
      fixture.siteDist,
      'html',
      'llms.txt',
      '# HTML\n\n---\n\nAll documentation: https://videojs.org/llms.txt\n'
    );
    writeDoc(fixture.siteDist, 'react', 'concepts/overview.md', link + footer);

    expect(
      packageDocumentation({
        target: 'cli',
        siteDist: fixture.siteDist,
        packagesDirectory: fixture.packagesDirectory,
      })
    ).toBe(2 + installationCount);
    expect(readFileSync(join(fixture.packagesDirectory, 'cli/docs/react/concepts/overview.md'), 'utf-8')).toBe(link);
    expect(readFileSync(join(fixture.packagesDirectory, 'cli/docs/html/llms.txt'), 'utf-8')).toBe('# HTML');
  });

  it('throws when a canonical installation document is missing', () => {
    const fixture = createFixture();

    writeDoc(fixture.siteDist, 'react', 'llms.txt', '# React');
    writeInstallationDocs(fixture.siteDist, 'react');
    rmSync(join(fixture.siteDist, 'docs/guides/installation/shadcn.md'));

    expect(() =>
      packageDocumentation({
        target: 'react',
        siteDist: fixture.siteDist,
        packagesDirectory: fixture.packagesDirectory,
      })
    ).toThrow(/installation\/shadcn\.md/);
  });

  it('validates every source before replacing existing output', () => {
    const fixture = createFixture();

    writeDoc(fixture.siteDist, 'html', 'llms.txt', '# HTML');
    const sentinel = join(fixture.packagesDirectory, 'cli/docs/sentinel.txt');

    mkdirSync(join(sentinel, '..'), { recursive: true });
    writeFileSync(sentinel, 'keep');

    expect(() =>
      packageDocumentation({
        target: 'cli',
        siteDist: fixture.siteDist,
        packagesDirectory: fixture.packagesDirectory,
      })
    ).toThrow(/react/);
    expect(existsSync(sentinel)).toBe(true);
  });
});
