import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { getDocTypeFromId, isSection } from '../../../types/docs';
import type { DiataxisRule, DocPage } from '../diataxis';
import { findDiataxisIssues } from '../diataxis';
import { getRedirectedSlugs } from '../redirects';
import { getAllGuideSlugs } from '../sidebar';

const CONTENT_ROOT = resolve(process.cwd(), 'src/content/docs');

/**
 * Pages whose prose still drifts from their folder. Each entry is debt: the test fails when the drift is fixed so the
 * entry gets removed, and no new page can join the list without editing it here.
 */
const KNOWN_DRIFT = new Map<string, DiataxisRule[]>([
  ['concepts/accessibility', ['task-heading']],
  ['concepts/media-sources', ['task-heading']],
  ['concepts/presets', ['task-heading']],
  ['concepts/ui-components', ['task-heading']],
  // Contributor authoring guides double as the MDX test bed and stop where the examples stop.
  ['writing-style/write-guides', ['missing-related-links']],
  ['writing-style/write-references', ['missing-related-links']],
]);

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return walk(path);

    return entry.name.endsWith('.mdx') ? [path] : [];
  });
}

/** The docs frontmatter is flat YAML with quoted or bare single-line scalars, which is all this needs to read. */
function frontmatterField(frontmatter: string, key: string): string {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  const value = match?.[1]?.trim() ?? '';

  return value.replace(/^(['"])(.*)\1$/, '$2');
}

function readPage(path: string): DocPage {
  const id = relative(CONTENT_ROOT, path).replace(/\.mdx$/, '');
  const source = readFileSync(path, 'utf8');
  const [, frontmatter = '', body = ''] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];

  return {
    id,
    type: getDocTypeFromId(id),
    title: frontmatterField(frontmatter, 'title'),
    description: frontmatterField(frontmatter, 'description'),
    body,
  };
}

const pages = walk(CONTENT_ROOT)
  .map(readPage)
  .sort((a, b) => a.id.localeCompare(b.id));

function page(overrides: Partial<DocPage>): DocPage {
  return {
    id: 'concepts/example',
    type: 'concept',
    title: 'Example',
    description: 'An example',
    body: '',
    ...overrides,
  };
}

describe('findDiataxisIssues', () => {
  it('rejects a literal how-to prefix on any title', () => {
    const rules = findDiataxisIssues(page({ type: 'guide', title: 'How to autoplay', body: '## Related guides' })).map(
      (issue) => issue.rule
    );

    expect(rules).toEqual(['title-how-to-prefix']);
  });

  it('flags concept prose that walks through a task', () => {
    const issues = findDiataxisIssues(
      page({
        description: 'How to configure the thing',
        body: [
          '<CustomUiNote />',
          '',
          '```bash',
          'pnpm add @videojs/react',
          '```',
          '',
          '## Create a player',
          '',
          '## Troubleshooting',
          '',
          '## Feature bundles',
        ].join('\n'),
      })
    );

    expect(issues.map((issue) => issue.rule)).toEqual([
      'description-how-to',
      'custom-ui-note',
      'how-to-section',
      'install-command',
      'task-heading',
    ]);
  });

  it('holds reference pages to the not-a-how-to rules but allows install commands', () => {
    const issues = findDiataxisIssues(
      page({
        type: 'reference',
        body: ['```bash', 'npm install @videojs/html', '```', '', '## Set up the element', '', '## How it works'].join(
          '\n'
        ),
      })
    );

    expect(issues.map((issue) => issue.rule)).toEqual(['how-to-section']);
  });

  it('requires guides to end with related links and skips the concept rules for them', () => {
    const drifting = findDiataxisIssues(page({ type: 'guide', body: '## Create a player\n\npnpm add x' }));
    const complete = findDiataxisIssues(page({ type: 'guide', body: '## Create a player\n\n## See also' }));

    expect(drifting.map((issue) => issue.rule)).toEqual(['missing-related-links']);
    expect(complete).toEqual([]);
  });

  it('ignores backticks and case when reading headings', () => {
    const issues = findDiataxisIssues(page({ body: '## Migrate from `config`\n\n### TROUBLESHOOTING' }));

    expect(issues.map((issue) => issue.rule)).toEqual(['how-to-section', 'task-heading']);
  });
});

describe('docs content', () => {
  it('reads like the folder it is filed in', () => {
    const unexpected = pages.flatMap((entry) =>
      findDiataxisIssues(entry).filter((issue) => !KNOWN_DRIFT.get(issue.id)?.includes(issue.rule))
    );
    const report = unexpected.map((issue) => `${issue.id} [${issue.rule}]: ${issue.message}`).join('\n');

    expect(unexpected, `\n${report}\n`).toEqual([]);
  });

  it('keeps the known drift list current', () => {
    const stale = [...KNOWN_DRIFT].flatMap(([id, rules]) => {
      const entry = pages.find((candidate) => candidate.id === id);
      const present = new Set(entry ? findDiataxisIssues(entry).map((issue) => issue.rule) : []);

      return rules.filter((rule) => !present.has(rule)).map((rule) => `${id} [${rule}]`);
    });

    expect(stale, 'remove fixed entries from KNOWN_DRIFT').toEqual([]);
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

  it('lists only concept pages under a Concepts section', async () => {
    const { sidebar } = await import('../../../docs.config');
    const misfiled: string[] = [];

    const visit = (items: typeof sidebar) => {
      for (const item of items) {
        if (!isSection(item)) continue;

        if (item.sidebarLabel === 'Concepts') {
          misfiled.push(...getAllGuideSlugs(item.contents).filter((slug) => getDocTypeFromId(slug) !== 'concept'));
        }

        visit(item.contents);
      }
    };

    visit(sidebar);
    expect(misfiled).toEqual([]);
  });
});
