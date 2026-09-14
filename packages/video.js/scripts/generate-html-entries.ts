import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildPackageFields,
  HTML_DIR,
  type HtmlPackageJson,
  renderHtmlEntry,
  resolveHtmlModules,
} from './html-entries.ts';

/**
 * Regenerates `src/html/**` (one re-export module per public `@videojs/html` module) and syncs the mirrored fields of
 * `package.json`. Runs before every build so the `video.js` surface tracks `@videojs/html` automatically.
 */

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlRoot = resolve(packageRoot, '../html');
const outDir = join(packageRoot, 'src', HTML_DIR);

function writeIfChanged(file: string, content: string): boolean {
  if (existsSync(file) && readFileSync(file, 'utf8') === content) return false;

  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);

  return true;
}

const html: HtmlPackageJson = JSON.parse(readFileSync(join(htmlRoot, 'package.json'), 'utf8'));
const modules = resolveHtmlModules(join(htmlRoot, 'src'), html.exports);

rmSync(outDir, { recursive: true, force: true });

for (const module of modules) {
  writeIfChanged(join(outDir, `${module.modulePath}.ts`), renderHtmlEntry(module));
}

const packageJsonPath = join(packageRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const synced = { ...packageJson, ...buildPackageFields(html) };
const packageChanged = writeIfChanged(packageJsonPath, `${JSON.stringify(synced, null, 2)}\n`);

console.log(
  `video.js: generated ${modules.length} @videojs/html re-exports${packageChanged ? ' and updated package.json' : ''}`
);
