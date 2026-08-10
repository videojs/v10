import type { Dirent } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, posix, relative, resolve, sep } from 'node:path';
import { format } from 'oxfmt';
import ts from 'typescript';

export interface GeneratedFile {
  path: string;
  content: string;
}

export async function collectGeneratedFiles(
  generated: Iterable<GeneratedFile>,
  outputDir: string,
  files: Map<string, string> = new Map()
): Promise<Map<string, string>> {
  for (const file of generated) {
    const path = posix.join(outputDir, file.path);
    const content = await formatGeneratedFile(path, file.content);
    const previous = files.get(path);
    if (previous !== undefined && previous !== content) throw new Error(`Generated output collision: ${path}`);
    files.set(path, content);
  }
  return files;
}

export async function syncGeneratedFiles(options: {
  rootDir: string;
  files: ReadonlyMap<string, string>;
  managedRoots: readonly string[];
  check?: boolean | undefined;
}): Promise<void> {
  const rootDir = resolve(options.rootDir);
  const existing = (
    await Promise.all(
      options.managedRoots.map(async (root) =>
        (await walkFiles(resolve(rootDir, root))).map((path) => posix.join(root, path))
      )
    )
  )
    .flat()
    .sort();

  if (options.check) {
    const differences = await generatedDifferences(rootDir, options.files, existing);
    if (differences.length > 0) {
      throw new Error(`Generated skins are out of date:\n${differences.map((path) => `- ${path}`).join('\n')}`);
    }
    return;
  }

  for (const [path, content] of options.files) {
    const fileName = resolve(rootDir, path);
    await mkdir(dirname(fileName), { recursive: true });
    await writeFile(fileName, content);
  }
  for (const path of existing) {
    if (!options.files.has(path)) await rm(resolve(rootDir, path));
  }
}

export async function formatGeneratedFile(path: string, content: string): Promise<string> {
  const result = await format(path, content, {
    printWidth: 120,
    singleQuote: true,
    htmlWhitespaceSensitivity: 'ignore',
  });
  if (result.errors.length > 0) throw new Error(result.errors.map((error) => error.message).join('\n'));
  return isTypeScriptSource(path) ? separateTopLevelStatements(path, result.code) : result.code;
}

function separateTopLevelStatements(path: string, source: string): string {
  // Oxfmt preserves top-level spacing but does not add it to compiler output.
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const edits: Array<{ start: number; end: number }> = [];

  for (let index = 0; index < sourceFile.statements.length - 1; index++) {
    const current = sourceFile.statements[index];
    const next = sourceFile.statements[index + 1];
    if (!current || !next || (ts.isImportDeclaration(current) && ts.isImportDeclaration(next))) continue;

    const start = current.getEnd();
    let end = start;
    while (end < next.getStart(sourceFile) && /\s/.test(source[end] ?? '')) end++;
    const separator = source.slice(start, end);
    if (separator.trim() || /\r?\n[\t ]*\r?\n/.test(separator)) continue;
    edits.push({ start, end });
  }

  let output = source;
  for (const edit of edits.reverse()) output = `${output.slice(0, edit.start)}\n\n${output.slice(edit.end)}`;
  return output;
}

function isTypeScriptSource(path: string): boolean {
  return /\.(?:[cm]?ts|tsx)$/.test(path);
}

async function generatedDifferences(
  rootDir: string,
  expected: ReadonlyMap<string, string>,
  existing: readonly string[]
): Promise<string[]> {
  const differences: string[] = [];
  for (const [path, content] of expected) {
    try {
      if ((await readFile(resolve(rootDir, path), 'utf8')) !== content) differences.push(path);
    } catch {
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
  } catch {
    return [];
  }
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(currentDir, entry.name);
      if (entry.isDirectory()) return walkFiles(rootDir, path);
      return [toPosixPath(relative(rootDir, path))];
    })
  );
  return files.flat();
}

function toPosixPath(path: string): string {
  return path.split(sep).join('/');
}
