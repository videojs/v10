import type { DocType } from '@/types/docs';

/** The parts of a docs page the Diátaxis rules read. */
export interface DocPage {
  /** Collection id, such as `guides/autoplay`. */
  id: string;
  type: DocType;
  title: string;
  description: string;
  /** MDX source without its frontmatter block. */
  body: string;
}

export interface DiataxisIssue {
  id: string;
  rule: DiataxisRule;
  message: string;
}

export type DiataxisRule =
  | 'title-how-to-prefix'
  | 'description-how-to'
  | 'custom-ui-note'
  | 'install-command'
  | 'task-heading'
  | 'how-to-section'
  | 'missing-related-links';

const HOW_TO_PREFIX = /^how to\b/i;
const CUSTOM_UI_NOTE = /<CustomUiNote\b/;
const INSTALL_COMMAND = /^\s*(?:pnpm|npm|yarn|bun)\s+(?:add|i|install)\b/m;
const HEADING = /^#{2,6}\s+(.+?)\s*$/gm;
const RELATED_SECTION = /^##\s+(?:Related\b|See also\b|Choose what to do next\b)/m;

/** Headings that only the how-to template owns; on a concept or reference page they signal instruction creeping in. */
const HOW_TO_SECTIONS = new Set(['recommended approach', 'how it works', 'common variations', 'troubleshooting']);

/**
 * First words that turn a heading into an instruction. Concept headings name the thing being explained ("Feature
 * bundles"), not the task ("Create a player"). Kept deliberately short so the rule stays precise.
 */
const TASK_VERBS = new Set([
  'access',
  'add',
  'build',
  'check',
  'checking',
  'choose',
  'clean',
  'configure',
  'connect',
  'create',
  'customize',
  'customizing',
  'eject',
  'enable',
  'extend',
  'extending',
  'externalize',
  'handle',
  'install',
  'keep',
  'load',
  'migrate',
  'pass',
  'register',
  'release',
  'remove',
  'run',
  'set',
  'swap',
  'test',
  'use',
  'using',
  'write',
]);

function headings(body: string): string[] {
  return [...body.matchAll(HEADING)].map((match) => match[1]!.replace(/`/g, ''));
}

function firstWord(heading: string): string {
  return heading.split(/\s+/)[0]?.toLowerCase() ?? '';
}

/**
 * Report where a page's prose disagrees with the folder it is filed in. Each rule is one observable drift signal from
 * `.agents/skills/write-docs/references/diataxis.md`; the authoring guide explains the reasoning behind them.
 */
export function findDiataxisIssues(page: DocPage): DiataxisIssue[] {
  const issues: DiataxisIssue[] = [];
  const report = (rule: DiataxisRule, message: string) => issues.push({ id: page.id, rule, message });

  if (HOW_TO_PREFIX.test(page.title)) {
    report('title-how-to-prefix', `Title "${page.title}" should complete "How to…" without the literal prefix.`);
  }

  if (page.type === 'guide') {
    if (!RELATED_SECTION.test(page.body)) {
      report('missing-related-links', 'Guides end with Related components, Related API, or Related guides sections.');
    }

    return issues;
  }

  // Concept and reference pages share the "not a how-to" rules.
  if (HOW_TO_PREFIX.test(page.description)) {
    report('description-how-to', `Description "${page.description}" promises a task; that belongs in a guide.`);
  }

  if (CUSTOM_UI_NOTE.test(page.body)) {
    report('custom-ui-note', '<CustomUiNote /> frames a task for custom-UI builders and only belongs in a guide.');
  }

  for (const heading of headings(page.body)) {
    if (HOW_TO_SECTIONS.has(heading.toLowerCase())) {
      report('how-to-section', `Heading "${heading}" is a how-to template section; move the task to a guide.`);
    }
  }

  if (page.type === 'concept') {
    if (INSTALL_COMMAND.test(page.body)) {
      report('install-command', 'Install commands walk the reader through a task; a concept links the guide instead.');
    }

    for (const heading of headings(page.body)) {
      if (TASK_VERBS.has(firstWord(heading))) {
        report('task-heading', `Heading "${heading}" gives an instruction; name what the section explains instead.`);
      }
    }
  }

  return issues;
}
