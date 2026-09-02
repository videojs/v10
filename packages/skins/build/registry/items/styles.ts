import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { RegistryStylesOptions } from '../../../../vjsc/src/shadcn/index.ts';
import { utilities } from '../../../src/styles/utilities.ts';
import { vars } from '../../../src/styles/vars.ts';
import type { VideojsRegistryMeta } from '../meta.ts';
import type { RegistryTarget } from '../targets.ts';

const sharedTailwindSource = resolve(import.meta.dirname, '../../../src/styles/tailwind.shared.css');

export function registryStyles(target: RegistryTarget): RegistryStylesOptions {
  const meta = {
    role: 'support',
    framework: target.framework,
    styling: target.styling,
    public: false,
  } satisfies VideojsRegistryMeta;

  return {
    theme: {
      target: 'styles/theme.css',
      include: ['./styles/base.css', './styles/captions.css', './styles/themes/video.css', './styles/themes/audio.css'],
      title: 'Video.js media theme',
      description: 'Scoped media tokens, resets, preferences, and Tailwind compiler integration.',
      docs: themeDocs(target),
      tailwind: target.styling === 'tailwind' ? './styles/tailwind.shared.css' : undefined,
      meta,
    },
    files: target.framework === 'react' && target.styling === 'css' ? 'styles' : undefined,
  };
}

/** Human-readable catalog of the public tokens, Tailwind theme keys, utilities, and variants the theme ships. */
function themeDocs(target: RegistryTarget): string {
  const sections = [
    'Installed automatically with Video.js skins and UI components. Import it before any skin or component stylesheet.',
    section(
      'Customize with CSS variables',
      Object.entries(vars)
        .filter(([, variable]) => variable.kind === 'public')
        .map(([name, variable]) => `\`${name}\`: ${variable.description}`)
    ),
  ];

  if (target.styling === 'tailwind') {
    const entries = Object.entries(utilities);

    sections.push(
      section('Tailwind theme keys', [...themeAliasDocs(), ...docsOfKind(entries, 'theme')]),
      section('Utilities', docsOfKind(entries, 'utility')),
      section('Variants', docsOfKind(entries, 'variant'))
    );
  }

  return sections.join('\n\n');
}

function section(title: string, lines: readonly string[]): string {
  return `## ${title}\n\n${lines.map((line) => `- ${line}`).join('\n')}`;
}

function docsOfKind(entries: Array<[string, { kind: string; description: string }]>, kind: string): string[] {
  return entries.filter(([, rule]) => rule.kind === kind).map(([name, rule]) => `\`${name}\`: ${rule.description}`);
}

/** Theme keys that alias a `--media-*` token inherit that token's description. */
function themeAliasDocs(): string[] {
  const source = readFileSync(sharedTailwindSource, 'utf8');
  const descriptions = new Map(Object.entries(vars).map(([name, variable]) => [name, variable.description]));
  const docs: string[] = [];

  for (const [, key, alias] of source.matchAll(/^\s*(--[a-z-]+):\s*var\((--media-[a-z-]+)\);/gm)) {
    const description = descriptions.get(alias!);

    if (description) docs.push(`\`${key}\`: ${description}`);
  }

  return docs;
}
