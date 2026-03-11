import path from 'node:path';
import chalk from 'chalk';
import { createTwoFilesPatch } from 'diff';
import type { Result } from 'dir-compare';
import { compareSync } from 'dir-compare';
import fs from 'fs-extra';
import prompts from 'prompts';

export const SRC = './src';
export const TEMPLATES = './templates';

export interface Change {
  state: 'left' | 'right' | 'distinct';
  name: string;
  relativePath: string;
}

export function getChanges(): Change[] {
  const res: Result = compareSync(SRC, TEMPLATES, { compareContent: true });

  return (res.diffSet ?? [])
    .filter((d) => d.state !== 'equal' && d.type1 !== 'directory' && d.type2 !== 'directory')
    .map((d) => ({
      state: d.state as Change['state'],
      name: (d.name1 ?? d.name2)!,
      relativePath: d.relativePath,
    }))
    .filter((d) => d.name != null);
}

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

export function printDiff(oldPath: string, newPath: string, label: string): void {
  const oldContent = fs.existsSync(oldPath) ? fs.readFileSync(oldPath, 'utf8') : '';
  const newContent = fs.existsSync(newPath) ? fs.readFileSync(newPath, 'utf8') : '';
  const patch = createTwoFilesPatch(label, label, oldContent, newContent, undefined, undefined, { context: 3 });

  // Strip the first two header lines (Index + ===) that createTwoFilesPatch adds
  const lines = patch.split('\n');
  const body = lines.slice(2).join('\n');

  console.log(colorizePatch(body));
}

export function filePath(change: Change): string {
  return path.join(change.relativePath, change.name);
}

export function srcPath(change: Change): string {
  return path.join(SRC, change.relativePath, change.name);
}

export function templatesPath(change: Change): string {
  return path.join(TEMPLATES, change.relativePath, change.name);
}

export async function confirm(message: string): Promise<boolean> {
  const { ok } = await prompts({
    type: 'confirm',
    name: 'ok',
    message,
    initial: false,
  });

  return ok === true;
}
