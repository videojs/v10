import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCALES, localeAliases } from '../../core/src/core/i18n/locales.ts';

const REGISTRY = '@videojs/html/cdn/i18n-registry';
const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/cdn/locales');

const tags = [...LOCALES, ...localeAliases(LOCALES)];

mkdirSync(outDir, { recursive: true });

for (const tag of tags) {
  const body = `import { registerI18n } from '${REGISTRY}';
import translations from '@videojs/core/i18n/locales/${tag}';

registerI18n('${tag}', translations);
`;
  writeFileSync(resolve(outDir, `${tag}.ts`), body);
}
