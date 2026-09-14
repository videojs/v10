import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { getDocTypeFromId } from '../../../types/docs';
import type { DocPage } from '../diataxis';
import { findDiataxisIssues } from '../diataxis';
import { getRedirectedSlugs } from '../redirects';
import { getAllGuideSlugs } from '../sidebar';

const CONTENT_ROOT = resolve(process.cwd(), 'src/content/docs');

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return walk(path);

    return entry.name.endsWith('.mdx') ? [path] : [];
  });
}

/** The docs frontmatter is flat YAML with quoted or bare single-line scalars, which is all this needs to read. */
function frontmatterTitle(frontmatter: string): string {
  const value = frontmatter.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? '';

  return value.replace(/^(['"])(.*)\1$/, '$2');
}

function readPage(path: string): DocPage {
  const id = relative(CONTENT_ROOT, path).replace(/\.mdx$/, '');
  const source = readFileSync(path, 'utf8');
  const [, frontmatter = '', body = ''] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];

  return { id, type: getDocTypeFromId(id), title: frontmatterTitle(frontmatter), body };
}

const pages = walk(CONTENT_ROOT)
  .map(readPage)
  .sort((a, b) => a.id.localeCompare(b.id));

function page(overrides: Partial<DocPage>): DocPage {
  return { id: 'guides/example', type: 'guide', title: 'Example', body: '', ...overrides };
}

describe('findDiataxisIssues', () => {
  it('rejects a literal how-to prefix on any title', () => {
    expect(findDiataxisIssues(page({ title: 'How to autoplay' })).map((issue) => issue.rule)).toEqual([
      'title-how-to-prefix',
    ]);
    expect(findDiataxisIssues(page({ type: 'reference', title: 'How to use PlayButton' }))).toHaveLength(1);
  });

  it('keeps task walkthroughs off reference pages', () => {
    const issues = findDiataxisIssues(
      page({
        type: 'reference',
        body: ['<CustomUiNote />', '', '## Import', '', '## Troubleshooting', '', '### How It Works'].join('\n'),
      })
    );

    expect(issues.map((issue) => issue.rule)).toEqual([
      'reference-custom-ui-note',
      'reference-how-to-section',
      'reference-how-to-section',
    ]);
  });

  it('lets guides explain, instruct, and troubleshoot', () => {
    const body = '<CustomUiNote />\n\n## Recommended approach\n\n## How it works\n\n## Troubleshooting';

    expect(findDiataxisIssues(page({ body }))).toEqual([]);
  });
});

describe('docs content', () => {
  it('keeps every page inside the boundary of its folder', () => {
    const issues = pages.flatMap((entry) => findDiataxisIssues(entry));
    const report = issues.map((issue) => `${issue.id} [${issue.rule}]: ${issue.message}`).join('\n');

    expect(issues, `\n${report}\n`).toEqual([]);
  });

  it('registers every page in the sidebar', () => {
    const registered = new Set(getAllGuideSlugs());
    const orphans = pages.map((entry) => entry.id).filter((id) => !registered.has(id));

    expect(orphans).toEqual([]);
  });

  it('keeps redirected slugs free of live pages', async () => {
    const { sidebar } = await import('../../../docs.config');
    const live = new Set([...pages.map((entry) => entry.id), ...getAllGuideSlugs(sidebar)]);
    const collisions = getRedirectedSlugs(sidebar).filter((slug) => live.has(slug));

    expect(collisions).toEqual([]);
  });
});
