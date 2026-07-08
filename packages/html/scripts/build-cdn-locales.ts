import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCALES } from '../../core/src/core/i18n/locales.ts';

const REGISTRY = '@videojs/html/cdn/i18n-registry';
const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/cdn/locales');

function localeAliases(tags: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const tag of tags) {
    if (!tag.includes('-')) continue;
    const lang = tag.split('-')[0];
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  return [...counts].filter(([, count]) => count > 1).map(([lang]) => lang);
}

const tags = [...LOCALES, ...localeAliases(LOCALES)];

mkdirSync(outDir, { recursive: true });

for (const tag of tags) {
  const body = `import { registerI18n } from '${REGISTRY}';
import translations from '@videojs/core/i18n/locales/${tag}';

registerI18n('${tag}', translations);
`;
  writeFileSync(resolve(outDir, `${tag}.ts`), body);
}
