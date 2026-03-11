import chalk from 'chalk';
import fs from 'fs-extra';

import { confirm, filePath, getChanges, printDiff, SRC, srcPath, TEMPLATES, templatesPath } from './shared.js';

console.log(chalk.bold(`\nComparing ${SRC} → ${TEMPLATES}\n`));

const changes = getChanges();

if (changes.length === 0) {
  console.log(chalk.gray('No differences found. Directories are in sync.'));
  process.exit(0);
}

for (const change of changes) {
  const label = filePath(change);

  if (change.state === 'left') {
    console.log(chalk.green(`  + ${label}  (new in src)`));
    printDiff('', srcPath(change), label);
  }

  if (change.state === 'right') {
    console.log(chalk.red(`  - ${label}  (only in templates)`));
  }

  if (change.state === 'distinct') {
    console.log(chalk.yellow(`  ~ ${label}  (modified)`));
    printDiff(templatesPath(change), srcPath(change), label);
  }
}

console.log();
console.log(chalk.bold(`${changes.length} change(s) found.`));
console.log();

const ok = await confirm(`Copy all changes from ${SRC} to ${TEMPLATES}?`);

if (!ok) {
  console.log(chalk.gray('\nAborted. No files were copied.'));
  process.exit(0);
}

// Only copy changed/new files from src — skip 'right' entries (only in templates)
for (const change of changes) {
  if (change.state === 'right') continue;

  const dest = templatesPath(change);
  await fs.copy(srcPath(change), dest, { overwrite: true });
  console.log(chalk.green(`  ✔ Copied ${filePath(change)}`));
}

console.log(chalk.bold.green('\nDone!\n'));
