import chalk from 'chalk';
import fs from 'fs-extra';

import {
  confirm,
  filePath,
  getChanges,
  mirrorTemplatesToSrc,
  printDiff,
  removeGeneratedSrcFiles,
  srcPath,
  templatesPath,
} from './shared.js';

const changes = getChanges();

// Files in src that differ from templates (will be overwritten)
const modified = changes.filter((d) => d.state === 'distinct');
// Files only in src (will be deleted)
const added = changes.filter((d) => d.state === 'left');
// Files only in templates (will be recreated in src)
const missing = changes.filter((d) => d.state === 'right');

if (modified.length === 0 && added.length === 0 && missing.length === 0) {
  console.log(chalk.gray('\nNo local changes. Already in sync with templates.\n'));
  process.exit(0);
}

if (modified.length > 0 || added.length > 0) {
  console.log(chalk.bold('\nThe following changes in src/ will be replaced from templates/:\n'));
}

for (const change of modified) {
  const label = filePath(change);
  console.log(chalk.yellow(`  ~ ${label}`));
  printDiff(srcPath(change), templatesPath(change), label);
}

for (const change of added) {
  console.log(chalk.red(`  + ${filePath(change)}  (will be deleted)`));
}

if (missing.length > 0) {
  console.log(chalk.bold('\nThe following template files will be restored into src/:\n'));

  for (const change of missing) {
    console.log(chalk.green(`  + ${filePath(change)}  (will be restored)`));
  }
}

if (modified.length > 0 || added.length > 0 || missing.length > 0) {
  console.log();
}

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

const restored = await mirrorTemplatesToSrc();
const removedGenerated = await removeGeneratedSrcFiles();

for (const file of restored) {
  console.log(chalk.green(`  ✔ Restored ${file.replace(/^src\//, '')}`));
}

for (const file of removedGenerated) {
  console.log(chalk.green(`  ✔ Removed generated ${file.replace(/^src\//, '')}`));
}

console.log(chalk.bold.green('\nReset complete!\n'));
