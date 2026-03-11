import chalk from 'chalk';
import fs from 'fs-extra';

import { confirm, filePath, getChanges, printDiff, srcPath, templatesPath } from './shared.js';

const changes = getChanges();

// Files in src that differ from templates (will be overwritten)
const modified = changes.filter((d) => d.state === 'distinct');
// Files only in src (will be deleted)
const added = changes.filter((d) => d.state === 'left');

if (modified.length === 0 && added.length === 0) {
  console.log(chalk.gray('\nNo local changes. Already in sync with templates.\n'));
  process.exit(0);
}

console.log(chalk.bold('\nThe following local changes will be lost:\n'));

for (const change of modified) {
  const label = filePath(change);
  console.log(chalk.yellow(`  ~ ${label}`));
  printDiff(templatesPath(change), srcPath(change), label);
}

for (const change of added) {
  console.log(chalk.red(`  + ${filePath(change)}  (will be deleted)`));
}

console.log();

const ok = await confirm('Reset src/ to templates? This cannot be undone.');

if (!ok) {
  console.log(chalk.gray('\nAborted. No files were changed.\n'));
  process.exit(0);
}

for (const change of modified) {
  await fs.copy(templatesPath(change), srcPath(change), { overwrite: true });
  console.log(chalk.green(`  ✔ Reset ${filePath(change)}`));
}

for (const change of added) {
  await fs.remove(srcPath(change));
  console.log(chalk.red(`  ✔ Deleted ${filePath(change)}`));
}

console.log(chalk.bold.green('\nReset complete!\n'));
