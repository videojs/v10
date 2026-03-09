import path from 'node:path';
import chalk from 'chalk';
import { createTwoFilesPatch } from 'diff';
import { compareSync } from 'dir-compare';
import fs from 'fs-extra';
import prompts from 'prompts';

const SOURCE = './src';
const TEMPLATES = './templates';
// Some file always live in src
const IGNORE = new Set(['index.html', 'main.tsx']);

function colorizePatch(patch: string): string {
  return patch
    .split('\n')
    .map((line) => {
      if (line.startsWith('---') || line.startsWith('+++')) return chalk.dim(line);
      if (line.startsWith('-')) return chalk.red(line);
      if (line.startsWith('+')) return chalk.green(line);
      if (line.startsWith('@@')) return chalk.cyan(line);
      return chalk.gray(line);
    })
    .join('\n');
}

function printDiff(oldPath: string, newPath: string, label: string): void {
  const oldContent = fs.existsSync(oldPath) ? fs.readFileSync(oldPath, 'utf8') : '';
  const newContent = fs.existsSync(newPath) ? fs.readFileSync(newPath, 'utf8') : '';
  const patch = createTwoFilesPatch(label, label, oldContent, newContent, undefined, undefined, { context: 3 });

  // Strip the first two header lines (Index + ===) that createTwoFilesPatch adds
  const lines = patch.split('\n');
  const body = lines.slice(2).join('\n');

  console.log(colorizePatch(body));
}

console.log(chalk.bold(`\nComparing ${SOURCE} → ${TEMPLATES}\n`));

const res = compareSync(SOURCE, TEMPLATES, { compareContent: true });

const changes = (res.diffSet ?? []).filter(
  (d) =>
    d.state !== 'equal' &&
    d.type1 !== 'directory' &&
    d.type2 !== 'directory' &&
    !IGNORE.has(d.name1 ?? '') &&
    !IGNORE.has(d.name2 ?? '')
);

if (changes.length === 0) {
  console.log(chalk.gray('No differences found. Directories are in sync.'));
  process.exit(0);
}

for (const diff of changes) {
  const name = diff.name1 ?? diff.name2;
  if (!name) continue;

  const filePath = path.join(diff.relativePath, name);

  if (diff.state === 'left') {
    console.log(chalk.green(`  + ${filePath}  (new in src)`));
    printDiff('', path.join(SOURCE, diff.relativePath, name), filePath);
  }

  if (diff.state === 'right') {
    console.log(chalk.red(`  - ${filePath}  (only in templates)`));
  }

  if (diff.state === 'distinct') {
    console.log(chalk.yellow(`  ~ ${filePath}  (modified)`));
    printDiff(path.join(TEMPLATES, diff.relativePath, name), path.join(SOURCE, diff.relativePath, name), filePath);
  }
}

console.log();
console.log(chalk.bold(`${changes.length} change(s) found.`));
console.log();

const { ok } = await prompts({
  type: 'confirm',
  name: 'ok',
  message: `Copy all changes from ${SOURCE} to ${TEMPLATES}?`,
  initial: false,
});

if (!ok) {
  console.log(chalk.gray('\nAborted. No files were copied.'));
  process.exit(0);
}

// Only copy changed/new files from src — skip 'right' entries (only in templates)
for (const diff of changes) {
  if (diff.state === 'right') continue; // don't delete files that only exist in templates

  if (!diff.name1) continue;

  const relPath = path.join(diff.relativePath, diff.name1);
  const src = path.join(SOURCE, relPath);
  const dest = path.join(TEMPLATES, relPath);

  await fs.copy(src, dest, { overwrite: true });
  console.log(chalk.green(`  ✔ Copied ${relPath}`));
}

console.log(chalk.bold.green('\nDone!\n'));
