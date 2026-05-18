import { describe, expect, it } from 'vitest';
import { type Framework, rewriteLinks, stripFooter, synthesizeReadme } from '../copy-package-docs.ts';

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

  it('leaves content without a footer unchanged', () => {
    const input = '# Heading\n\nBody.';
    expect(stripFooter(input)).toBe(input);
  });
});

describe('rewriteLinks', () => {
  it('rewrites an absolute same-framework .md link to a relative path', () => {
    const input = '- [Installation](https://videojs.org/docs/framework/react/how-to/installation.md): desc';
    expect(rewriteLinks(input, 'llms', 'react')).toBe('- [Installation](./how-to/installation.md): desc');
  });

  it('rewrites a root-relative same-framework link with a trailing slash', () => {
    const input = 'See [Play Button](/docs/framework/react/reference/play-button/) for details.';
    expect(rewriteLinks(input, 'concepts/overview', 'react')).toBe(
      'See [Play Button](../reference/play-button.md) for details.'
    );
  });

  it('rewrites a sibling-page link from inside a subdirectory', () => {
    const input = '[Skins](https://videojs.org/docs/framework/html/concepts/skins.md)';
    expect(rewriteLinks(input, 'concepts/overview', 'html')).toBe('[Skins](./skins.md)');
  });

  it('preserves a fragment when rewriting', () => {
    const input = '[Section](https://videojs.org/docs/framework/react/reference/play-button.md#props)';
    expect(rewriteLinks(input, 'llms', 'react')).toBe('[Section](./reference/play-button.md#props)');
  });

  it('does not touch links to a different framework', () => {
    const input = '[HTML docs](https://videojs.org/docs/framework/html/how-to/installation.md)';
    expect(rewriteLinks(input, 'llms', 'react')).toBe(input);
  });

  it('does not touch links to non-docs site pages', () => {
    const input = 'See the [blog](https://videojs.org/blog/post.md) for context.';
    expect(rewriteLinks(input, 'llms', 'react')).toBe(input);
  });

  it('preserves the .txt extension when rewriting a link to llms.txt', () => {
    const input = '[index](https://videojs.org/docs/framework/react/llms.txt)';
    expect(rewriteLinks(input, 'how-to/build-with-ai', 'react')).toBe('[index](../llms.txt)');
  });

  it('leaves bare framework-root URLs alone (empty slug)', () => {
    const input = '[Docs](https://videojs.org/docs/framework/react/)';
    expect(rewriteLinks(input, 'how-to/build-with-ai', 'react')).toBe(input);
  });

  it('does not rewrite URLs that appear inside link text (e.g. code spans)', () => {
    // The link text contains a URL-shaped string inside backticks; only the
    // target inside `(...)` should be rewritten.
    const input = '[`videojs.org/docs/framework/react/llms.txt`](https://videojs.org/docs/framework/react/llms.txt)';
    expect(rewriteLinks(input, 'how-to/build-with-ai', 'react')).toBe(
      '[`videojs.org/docs/framework/react/llms.txt`](../llms.txt)'
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
