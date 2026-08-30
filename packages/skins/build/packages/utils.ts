import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { GeneratedPackageFile } from './files.ts';

export function addGenerated(files: Map<string, string>, path: string, content: string): void {
  const previous = files.get(path);

  if (previous !== undefined && previous !== content) {
    throw new Error(`Generated package Skin output collision: \`${path}\`.`);
  }

  files.set(path, content);
}

export async function addCopiedFiles(
  files: Map<string, string>,
  workspaceDir: string,
  copies: readonly (readonly [source: string, destination: string])[]
): Promise<void> {
  await Promise.all(
    copies.map(async ([source, destination]) => {
      addGenerated(files, destination, await readFile(resolve(workspaceDir, source), 'utf8'));
    })
  );
}

export function generatedFiles(files: ReadonlyMap<string, string>): GeneratedPackageFile[] {
  return [...files].sort(([left], [right]) => left.localeCompare(right)).map(([path, content]) => ({ path, content }));
}

export function pascalCase(value: string): string {
  return value.replace(/(?:^|-)([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}
