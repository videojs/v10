import type { Dirent } from 'node:fs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import { toPosixPath } from '../utils/path';

export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
}

export interface GeneratedFileOptions {
  readonly cwd?: string | undefined;
  readonly check?: boolean | undefined;
}

export interface GeneratedFileResult {
  readonly outputPath: string;
  readonly code: string;
  readonly changed: boolean;
}

export type GeneratedFileFormatter = (file: GeneratedFile) => string | Promise<string>;

export interface SyncGeneratedFilesOptions {
  readonly rootDir: string;
  readonly files: Iterable<GeneratedFile>;
  /** Directories whose unlisted files are stale and should be removed. */
  readonly managedRoots: readonly string[];
  readonly check?: boolean | undefined;
  readonly format?: GeneratedFileFormatter | undefined;
}

export function writeGeneratedFile(
  output: string,
  code: string,
  options: GeneratedFileOptions = {}
): GeneratedFileResult {
  const cwd = options.cwd ?? process.cwd();
  const outputPath = isAbsolute(output) ? output : resolve(cwd, output);
  const existing = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : null;
  const changed = existing !== code;

  if (changed && options.check) {
    throw new Error(`Generated file is stale: ${outputPath}`);
  }

  if (changed) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, code, 'utf8');
  }

  return { outputPath, code, changed };
}

/** Write a complete generated file set and remove stale files from managed directories. */
export async function syncGeneratedFiles(options: SyncGeneratedFilesOptions): Promise<void> {
  const rootDir = resolve(options.rootDir);
  const expected = await collectFiles(rootDir, options.files, options.format);
  const managedFiles = await Promise.all(
    options.managedRoots.map(async (managedRoot) => {
      const root = generatedPath(rootDir, managedRoot, 'Managed root', true);
      return (await walkFiles(root.absolute)).map((path) => joinGeneratedPath(root.path, path));
    })
  );
  const existing = [...new Set(managedFiles.flat())].sort();

  if (options.check) {
    const differences = await generatedDifferences(rootDir, expected, existing);

    if (differences.length > 0) {
      throw new Error(`Generated files are out of date:\n${differences.map((path) => `- ${path}`).join('\n')}`);
    }

    return;
  }

  await Promise.all(
    [...expected].map(async ([path, content]) => {
      const fileName = generatedPath(rootDir, path, 'Generated file').absolute;
      await mkdir(dirname(fileName), { recursive: true });
      await writeFile(fileName, content);
    })
  );

  await Promise.all(
    existing
      .filter((path) => !expected.has(path))
      .map((path) => rm(generatedPath(rootDir, path, 'Generated file').absolute))
  );
}

async function collectFiles(
  rootDir: string,
  generated: Iterable<GeneratedFile>,
  format: GeneratedFileFormatter | undefined
): Promise<Map<string, string>> {
  const files = [...generated].map((file) => ({
    file,
    path: generatedPath(rootDir, file.path, 'Generated file').path,
  }));
  const paths = new Set<string>();

  for (const { path } of files) {
    if (paths.has(path)) throw new Error(`Generated output collision: ${path}`);
    paths.add(path);
  }

  const entries = await Promise.all(
    files.map(
      async ({ file, path }) => [path, format ? await format({ path, content: file.content }) : file.content] as const
    )
  );

  return new Map(entries);
}

async function generatedDifferences(
  rootDir: string,
  expected: ReadonlyMap<string, string>,
  existing: readonly string[]
): Promise<string[]> {
  const differences: string[] = [];

  for (const [path, content] of expected) {
    const fileName = generatedPath(rootDir, path, 'Generated file').absolute;

    try {
      if ((await readFile(fileName, 'utf8')) !== content) differences.push(path);
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
      differences.push(path);
    }
  }

  for (const path of existing) {
    if (!expected.has(path)) differences.push(path);
  }

  return [...new Set(differences)].sort();
}

async function walkFiles(rootDir: string, currentDir = rootDir): Promise<string[]> {
  let entries: Dirent[];

  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    if (isMissingFileError(error)) return [];
    throw error;
  }

  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = resolve(currentDir, entry.name);
        return entry.isDirectory() ? walkFiles(rootDir, path) : [toPosixPath(relative(rootDir, path))];
      })
    )
  ).flat();
}

function generatedPath(
  rootDir: string,
  path: string,
  label: 'Generated file' | 'Managed root',
  allowRoot = false
): { absolute: string; path: string } {
  if (isAbsolute(path)) throw new Error(`${label} path must be relative to its root: ${path}`);

  const absolute = resolve(rootDir, path);
  const localPath = relative(rootDir, absolute);

  if (
    (!allowRoot && localPath === '') ||
    localPath === '..' ||
    localPath.startsWith(`..${sep}`) ||
    isAbsolute(localPath)
  ) {
    throw new Error(`${label} path escapes its root: ${path}`);
  }

  return { absolute, path: toPosixPath(localPath) };
}

function joinGeneratedPath(root: string, path: string): string {
  return root ? `${root}/${path}` : path;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
