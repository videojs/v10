import { readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  collectCoverage,
  collectPackageEntries,
  collectPublicExports,
  resolveStabilities,
} from './check-api-stability';
const root = resolve(import.meta.dirname, '..', '..');
const dirs = readdirSync(join(root, 'packages'), { withFileTypes: true }).flatMap((e) => {
  const d = join(root, 'packages', e.name);
  if (existsSync(join(d, 'package.json'))) return [d];

  return readdirSync(d, { withFileTypes: true })
    .filter((c) => existsSync(join(d, c.name, 'package.json')))
    .map((c) => join(d, c.name));
});
const { exports } = collectPublicExports(dirs.flatMap(collectPackageEntries));
const resolved = resolveStabilities(exports, collectCoverage(join(root, 'site')));
const targets = new Set(process.argv.slice(2));

for (const r of exports) {
  for (const ref of [...r.references, ...r.heritageReferences]) {
    if (targets.has(ref.name) && resolved.get(r)!.stability !== 'internal')
      console.log(`${ref.name} <- ${r.name} [${[...r.specifiers][0]}] ${r.file.replace(root + '/', '')}`);
  }
}
