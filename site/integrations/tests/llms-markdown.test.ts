// @vitest-environment node
import { describe, expect, it } from 'vite-plus/test';

import { SITE_DESCRIPTION } from '../../src/consts';
import { sidebar } from '../../src/docs.config';
import { isLink, isSection, type Sidebar } from '../../src/types/docs';
import {
  convertPage,
  createTurndown,
  generateChronologicalIndex,
  generateDocsFull,
  generatePageFooter,
  generateRootIndex,
} from '../llms-markdown';

const SITE_URL = 'https://videojs.org';
const turndown = createTurndown();

function convert(body: string, attributes = ''): string {
  const html = `<html><body><article data-llms-content ${attributes}>${body}</article></body></html>`;
  const page = convertPage(html, turndown, SITE_URL);
  if (!page) throw new Error('page has no llms content');

  return page.markdown;
}

/** One tab group as `Tabs.tsx` renders it: labels in a tablist, every panel present in the DOM. */
function tabGroup(panels: Array<{ label: string; html: string }>): string {
  const tabs = panels.map(({ label }, index) => `<button role="tab" data-value="${index}">${label}</button>`).join('');
  const bodies = panels.map(({ html }, index) => `<div role="tabpanel" data-value="${index}">${html}</div>`).join('');

  return `<div data-tabs-root><div role="tablist">${tabs}</div>${bodies}</div>`;
}

function firstSidebarSlug(items: Sidebar): string {
  for (const item of items) {
    if (isSection(item)) return firstSidebarSlug(item.contents);

    if (!isLink(item)) return item.slug;
  }

  throw new Error('sidebar has no pages');
}

describe('convertPage', () => {
  it('emits an authored table as a GFM pipe table with escaped pipes and padded colspans', () => {
    const markdown = convert(`
      <table>
        <caption>Supported values</caption>
        <thead><tr><th>Value</th><th colspan="2">Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>'a' | 'b'</code></td><td>Either</td><td>letter</td></tr>
          <tr><td>none</td><td>Nothing<br>at all</td><td></td></tr>
        </tbody>
      </table>`);

    expect(markdown).toBe(
      [
        '*Supported values*',
        '',
        '| Value | Meaning | |',
        '| --- | --- | --- |',
        "| `'a' \\| 'b'` | Either | letter |",
        '| none | Nothing at all | |',
      ].join('\n')
    );
  });

  it('folds an API reference entry back into one row with its full type and description', () => {
    const markdown = convert(`
      <table data-apiref-table>
        <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th data-llms-ignore>Details</th></tr></thead>
        <tbody data-apiref-row>
          <tr>
            <td>
              <span><code>label<span data-apiref-required>*</span></code><a href="#Button-label" data-llms-ignore></a></span>
              <div data-apiref-attribute>attribute <code>aria-label</code></div>
            </td>
            <td data-apiref-cell="type"><code>object</code></td>
            <td><code>''</code></td>
            <td data-llms-ignore><button>toggle</button></td>
          </tr>
          <tr data-apiref-detail-row>
            <td colspan="4">
              <div data-apiref-description>
                <div data-llms-ignore>Description</div>
                <div>Custom label for the <code>button</code>.</div>
              </div>
              <div data-apiref-type>
                <div data-llms-ignore>Type</div>
                <pre data-language="ts"><code>{ key: string; text: string }
  | string</code></pre>
              </div>
            </td>
          </tr>
        </tbody>
        <tbody data-apiref-row>
          <tr>
            <td><code>disabled</code></td>
            <td data-apiref-cell="type"><code>boolean</code></td>
            <td><span>—</span></td>
            <td data-llms-ignore></td>
          </tr>
        </tbody>
      </table>`);

    expect(markdown).toBe(
      [
        '| Prop | Type | Default | Description |',
        '| --- | --- | --- | --- |',
        "| `label` (required) (attribute `aria-label`) | `{ key: string; text: string } \\| string` | `''` | Custom label for the `button`. |",
        '| `disabled` | `boolean` | — | |',
      ].join('\n')
    );
  });

  it('keeps heading text that a transparent wrapper would otherwise eject', () => {
    expect(convert('<h3 id="root"><div class="contents">Root</div></h3><p>Body</p>')).toBe('### Root\n\nBody');
  });

  it('leaves marker wrappers in place for their own rules', () => {
    const markdown = convert('<div data-cli-replace="installation" class="contents"><p>Steps</p></div>');

    expect(markdown).toBe('<!-- cli:replace installation -->\n\nSteps\n\n<!-- /cli:replace installation -->');
  });

  it('restores the separators between code chips', () => {
    const markdown = convert(
      '<p>Supports <span class="code-list__item"><code>autoplay</code></span><span class="code-list__item"><code>muted</code></span></p>'
    );

    expect(markdown).toBe('Supports `autoplay`, `muted`.');
  });

  it('renders callouts as blockquotes that name their type and title', () => {
    const markdown = convert(`
      <aside data-aside="caution">
        <div></div>
        <div>
          <div><svg></svg></div>
          <div>
            <p data-aside-title>Load your script as a module</p>
            <div data-aside-body><p>Use <code>type="module"</code>.</p><p>Second paragraph.</p></div>
          </div>
        </div>
      </aside>
      <aside data-aside="note"><p data-aside-title>Note</p><div data-aside-body><p>Plain note.</p></div></aside>`);

    expect(markdown).toBe(
      [
        '> **Caution: Load your script as a module**',
        '> ',
        '> Use `type="module"`.',
        '> ',
        '> Second paragraph.',
        '',
        '> **Note**',
        '> ',
        '> Plain note.',
      ].join('\n')
    );
  });

  it('drops a frame label that only repeats the fence language', () => {
    const cases = [
      { label: 'js', language: 'javascript' },
      { label: 'HTML', language: 'html' },
      { label: 'code', language: 'plaintext' },
    ];

    for (const { label, language } of cases) {
      const markdown = convert(tabGroup([{ label, html: `<pre data-language="${language}">x()</pre>` }]));

      expect(markdown, label).toBe(`\`\`\`${language}\nx()\n\`\`\``);
    }
  });

  it('keeps filename labels and every label of a multi-panel group', () => {
    const single = convert(tabGroup([{ label: 'index.ts', html: '<pre data-language="ts">x()</pre>' }]));

    expect(single).toBe('**index.ts**\n\n```ts\nx()\n```');

    const multiple = convert(
      tabGroup([
        { label: 'npm', html: '<pre data-language="bash">npm i</pre>' },
        { label: 'pnpm', html: '<pre data-language="bash">pnpm add</pre>' },
      ])
    );

    expect(multiple).toBe('**npm**\n\n```bash\nnpm i\n```\n\n**pnpm**\n\n```bash\npnpm add\n```');
  });

  it('keeps the opening fence flush when an astro-slot wraps indented code', () => {
    const markdown = convert(
      '<p>Create:</p><div><astro-slot><pre data-language="js">  const a = 1;\n  b();</pre></astro-slot></div>'
    );

    expect(markdown).toBe('Create:\n\n```js\n  const a = 1;\n  b();\n```');
  });

  it('fills a streamed Suspense boundary from its hidden payload', () => {
    const group = tabGroup([
      { label: 'npm', html: '<!--$?--><template id="r1B:0"></template><pre data-llms-ignore>loading</pre><!--/$-->' },
    ]);
    const markdown = convert(`${group}<div hidden id="r1S:0"><pre data-language="bash">npx shadcn add</pre></div>`);

    expect(markdown).toBe('**npm**\n\n```bash\nnpx shadcn add\n```');
  });

  it('links embedded frames instead of dropping them', () => {
    const markdown = convert('<p>Watch:</p><iframe src="https://www.youtube.com/embed/abc" title="Demo"></iframe>');

    expect(markdown).toBe('Watch:\n\n[Demo](https://www.youtube.com/embed/abc)');
  });

  it('uses a dash marker sized to its content indent', () => {
    const markdown = convert(
      '<ul><li>One<ul><li>Nested</li></ul></li><li>Two</li></ul><ol start="3"><li>Three</li></ol>'
    );

    expect(markdown).toBe('- One\n  - Nested\n- Two\n\n3. Three');
  });

  it('keeps blank lines inside a list item free of trailing spaces', () => {
    const markdown = convert('<ol><li><p>Step</p><pre data-language="bash">run</pre></li><li><p>Next</p></li></ol>');

    expect(markdown).toBe('1. Step\n\n   ```bash\n   run\n   ```\n2. Next');
  });

  it('passes hidden llms-only blocks through and drops ignored ones', () => {
    const markdown = convert(
      '<div data-llms-ignore>Sep 8, 2026•</div><h1>Title</h1><div hidden data-llms-only><p>Published 2026-09-08.</p></div>'
    );

    expect(markdown).toBe('# Title\n\nPublished 2026-09-08.');
  });
});

describe('generatePageFooter', () => {
  it('ends the file with a newline and lists every framework index', () => {
    expect(generatePageFooter('docs/guides/installation/shadcn', undefined, ['react', 'html'], SITE_URL)).toBe(
      [
        '',
        '',
        '---',
        '',
        'React documentation: https://videojs.org/docs/framework/react/llms.txt',
        'HTML documentation: https://videojs.org/docs/framework/html/llms.txt',
        'All documentation: https://videojs.org/llms.txt',
        '',
      ].join('\n')
    );
  });
});

describe('generateRootIndex', () => {
  it('describes each entry and lists the complete files under Optional with a size', () => {
    const index = generateRootIndex({
      frameworks: ['react', 'html'],
      fullTokens: new Map([
        ['html', 243_000],
        ['react', 245_400],
      ]),
      hasBlog: true,
      hasChangelog: true,
      otherPages: [{ pathname: '/about-this-player', title: 'About this player', description: 'What this is.' }],
      siteUrl: SITE_URL,
    });

    expect(index).toContain(`> ${SITE_DESCRIPTION}\n`);
    expect(index).toContain(
      '- [HTML documentation](https://videojs.org/docs/framework/html/llms.txt): Every HTML guide and reference page, each with a one-line description.\n' +
        '- [React documentation](https://videojs.org/docs/framework/react/llms.txt): Every React guide'
    );
    expect(index).toContain('- [About this player](https://videojs.org/about-this-player.md): What this is.');
    expect(index).toContain(
      '## Optional\n\n- [HTML documentation, complete](https://videojs.org/docs/framework/html/llms-full.txt): Every HTML page in one file (about 243k tokens)'
    );
    expect(index).not.toContain('Html');
  });
});

describe('generateChronologicalIndex', () => {
  it('orders same-day entries by version, newest first, and shows each date', () => {
    const pages = ['beta.9', 'beta.10', 'beta.11'].map((tag) => ({
      pathname: `/changelog/10.0.0-${tag}`,
      title: `v10.0.0-${tag}`,
      description: 'Notes.',
      sort: '2026-04-14T00:00:00.000Z',
    }));

    const index = generateChronologicalIndex('Changelog', pages, SITE_URL);

    expect(index).toContain(
      [
        '- [v10.0.0-beta.11](https://videojs.org/changelog/10.0.0-beta.11.md): Notes. (2026-04-14)',
        '- [v10.0.0-beta.10](https://videojs.org/changelog/10.0.0-beta.10.md): Notes. (2026-04-14)',
        '- [v10.0.0-beta.9](https://videojs.org/changelog/10.0.0-beta.9.md): Notes. (2026-04-14)',
      ].join('\n')
    );
  });

  it('prints an optional note under the title', () => {
    expect(generateChronologicalIndex('Blog', [], SITE_URL, 'Older posts.')).toContain(
      '# Video.js v10 — Blog\n\n> Older posts.\n\n'
    );
  });
});

describe('generateDocsFull', () => {
  it('points same-page anchors back at their page and quotes the corpus size', () => {
    const slug = firstSidebarSlug(sidebar);
    const pathname = `/docs/framework/html/${slug}`;
    const full = generateDocsFull(
      'html',
      [{ pathname, title: 'Page', framework: 'html', markdown: '# Page\n\nSee [below](#details).\n\n## Details' }],
      SITE_URL
    );

    expect(full).toContain(`See [below](${SITE_URL}${pathname}#details).`);
    expect(full).toMatch(
      /^# Video\.js v10 — HTML Documentation \(complete\)\n\n> Every HTML docs page in one file \(about \d+k tokens\)\./
    );
    expect(full).toContain(`<!-- Source: ${SITE_URL}${pathname} -->`);
  });
});
