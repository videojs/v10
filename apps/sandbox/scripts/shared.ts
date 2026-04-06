import path from 'node:path';
import chalk from 'chalk';
import { createTwoFilesPatch } from 'diff';
import type { Result } from 'dir-compare';
import { compareSync } from 'dir-compare';
import fs from 'fs-extra';
import prompts from 'prompts';

export const SRC = './src';
export const TEMPLATES = './templates';
const IGNORED_ROOT_FILES = new Set(['index.html']);
const GENERATED_SRC_FILES = new Set(['index.html', '__app-shell__.ts']);

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
    .filter((d) => d.name != null && !shouldIgnoreChange(d));
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

function isGeneratedSrcFile(change: Change): boolean {
  return change.relativePath === '.' && GENERATED_SRC_FILES.has(change.name);
}

function isIgnoredRootFile(change: Change): boolean {
  return change.relativePath === '.' && IGNORED_ROOT_FILES.has(change.name);
}

function shouldIgnoreChange(change: Change): boolean {
  if (isGeneratedSrcFile(change) || isIgnoredRootFile(change)) return true;

  // Sync/reset only manage sandbox directories, not loose files at the root.
  return change.relativePath === '.';
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

export async function mirrorTemplatesToSrc(): Promise<string[]> {
  const created: string[] = [];

  async function mirror(dir: string): Promise<void> {
    for (const entry of await fs.readdir(dir)) {
      const templatePath = path.join(dir, entry);
      const relativeFilePath = path.relative(TEMPLATES, templatePath);
      const targetPath = path.join(SRC, relativeFilePath);
      const stats = await fs.stat(templatePath);

      if (stats.isDirectory()) {
        await fs.ensureDir(targetPath);
        await mirror(templatePath);
        continue;
      }

      if (await fs.pathExists(targetPath)) continue;

      await fs.copy(templatePath, targetPath);
      created.push(targetPath);
    }
  }

  for (const entry of await fs.readdir(TEMPLATES)) {
    const templatePath = path.join(TEMPLATES, entry);
    const stats = await fs.stat(templatePath);

    if (!stats.isDirectory()) continue;

    await fs.ensureDir(path.join(SRC, entry));
    await mirror(templatePath);
  }

  return created;
}

export async function removeGeneratedSrcFiles(): Promise<string[]> {
  const removed: string[] = [];

  for (const file of GENERATED_SRC_FILES) {
    const filePath = path.join(SRC, file);

    if (!(await fs.pathExists(filePath))) continue;

    await fs.remove(filePath);
    removed.push(filePath);
  }

  return removed;
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
