import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { collectModuleReferences, type ModuleReference } from '@videojs/compiler/ast';
import ts from 'typescript';
import type {
  ResolvedSkinCatalog,
  ResolvedSkinItem,
  SkinCatalog,
  SkinClosure,
  SkinDependencyKind,
  SkinItem,
  SkinSymbols,
} from './types';

type DependencyGroups = Map<SkinDependencyKind, Set<string>>;

interface NormalizedItem {
  item: SkinItem;
  sourceFile: string;
}

interface AnalyzeSkinItemContext {
  entry: NormalizedItem;
  rootDir: string;
  entries: ReadonlyMap<string, NormalizedItem>;
  dependencies: Set<string>;
  sourceFiles: Set<string>;
  styleFiles: Set<string>;
  symbols: DependencyGroups;
  visited: Set<string>;
  catalog: SkinCatalog;
}

/**
 * Analyze each authored entry's local module graph. Registered entries become
 * item dependencies while unregistered modules remain private source files.
 */
export async function resolveSkinCatalog(
  catalog: SkinCatalog,
  options: { rootDir: string }
): Promise<ResolvedSkinCatalog> {
  const rootDir = resolve(options.rootDir);
  const normalized = normalizeItems([...catalog.skins, ...catalog.components], rootDir);
  const entries = new Map(normalized.map((entry) => [entry.sourceFile, entry]));
  const items: ResolvedSkinItem[] = [];

  for (const entry of normalized) {
    const dependencies = new Set<string>();
    const sourceFiles = new Set<string>();
    const styleFiles = new Set<string>();
    const symbols = createDependencyGroups();

    await analyzeSkinSourceFile(
      {
        entry,
        rootDir,
        entries,
        dependencies,
        sourceFiles,
        styleFiles,
        symbols,
        visited: new Set(),
        catalog,
      },
      entry.sourceFile
    );

    items.push({
      ...entry.item,
      dependencies: sortedUnique(dependencies),
      sourceFiles: sortedUnique(sourceFiles).map((fileName) => skinPath(rootDir, fileName)),
      styleFiles: sortedUnique(styleFiles).map((fileName) => skinPath(rootDir, fileName)),
      symbols: freezeGroups(symbols),
    });
  }

  items.sort((a, b) => compareStrings(a.name, b.name));
  diagnoseCycles(items);
  return { resources: catalog.resources, items };
}

/** Collect the transitive authored items, styles, and symbols needed by one item. */
export function resolveSkinClosure(catalog: ResolvedSkinCatalog, itemName: string): SkinClosure {
  const items = new Map(catalog.items.map((item) => [item.name, item]));
  if (!items.has(itemName)) throw new Error(`Skin item \`${itemName}\` does not exist.`);

  const resolvedItems: ResolvedSkinItem[] = [];
  const visited = new Set<string>();
  const sourceFiles = new Set<string>();
  const styleFiles = new Set<string>();
  const symbols = createDependencyGroups();

  const visit = (name: string): void => {
    if (visited.has(name)) return;
    visited.add(name);
    const item = items.get(name);
    if (!item) throw new Error(`Skin item \`${itemName}\` depends on missing item \`${name}\`.`);

    for (const dependency of item.dependencies) visit(dependency);
    resolvedItems.push(item);
    for (const file of item.sourceFiles) sourceFiles.add(file);
    for (const file of item.styleFiles) styleFiles.add(file);
    mergeGroups(symbols, item.symbols);
  };

  visit(itemName);
  return {
    items: resolvedItems,
    sourceFiles: sortedUnique(sourceFiles),
    styleFiles: sortedUnique(styleFiles),
    symbols: freezeGroups(symbols),
  };
}

function normalizeItems(items: readonly SkinItem[], rootDir: string): NormalizedItem[] {
  const normalized: NormalizedItem[] = [];
  const names = new Set<string>();
  const sources = new Set<string>();

  for (const item of [...items].sort((a, b) => compareStrings(a.name, b.name))) {
    if (names.has(item.name)) {
      throw new Error(`Skin item \`${item.name}\` is declared more than once.`);
    }
    names.add(item.name);

    const sourceFile = resolve(rootDir, item.source);
    if (!isWithinRoot(rootDir, sourceFile)) {
      throw new Error(`Skin item \`${item.name}\` source must stay inside the Skin root.`);
    }
    if (sources.has(sourceFile)) {
      throw new Error(`Skin source \`${skinPath(rootDir, sourceFile)}\` is declared more than once.`);
    }
    sources.add(sourceFile);
    normalized.push({ item, sourceFile });
  }
  return normalized;
}

async function analyzeSkinSourceFile(context: AnalyzeSkinItemContext, fileName: string): Promise<void> {
  const { entry, rootDir } = context;
  if (context.visited.has(fileName)) return;
  context.visited.add(fileName);

  let sourceText: string;
  try {
    sourceText = await readFile(fileName, 'utf8');
  } catch {
    throw new Error(`Skin item \`${entry.item.name}\` cannot read \`${skinPath(rootDir, fileName)}\`.`);
  }
  context.sourceFiles.add(fileName);

  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, scriptKind(fileName));

  for (const reference of collectModuleReferences(sourceFile)) {
    if (!reference.source.startsWith('.')) {
      recordDependencySymbols(context, sourceFile, reference);
      continue;
    }
    await visitRelativeReference(context, sourceFile, reference);
  }
}

function recordDependencySymbols(
  context: AnalyzeSkinItemContext,
  sourceFile: ts.SourceFile,
  reference: ModuleReference
): void {
  const symbolKind = context.catalog.dependencyModules[reference.source];
  if (symbolKind === undefined) return;
  if (reference.ambiguous) {
    throw nodeError(
      sourceFile,
      reference.node,
      `Skin item \`${context.entry.item.name}\` must use named imports from \`${reference.source}\` so ${symbolKind} dependencies can be inferred.`
    );
  }
  const target = context.symbols.get(symbolKind);
  if (!target) throw new Error(`Unknown Skin dependency kind \`${symbolKind}\`.`);
  for (const name of reference.names) target.add(name);
}

async function visitRelativeReference(
  context: AnalyzeSkinItemContext,
  sourceFile: ts.SourceFile,
  reference: ModuleReference
): Promise<void> {
  const importedFile = await resolveImportedFile(sourceFile.fileName, reference.source);
  if (!importedFile) {
    throw nodeError(
      sourceFile,
      reference.node,
      `Skin item \`${context.entry.item.name}\` cannot resolve \`${reference.source}\`.`
    );
  }
  if (!isWithinRoot(context.rootDir, importedFile)) {
    throw nodeError(
      sourceFile,
      reference.node,
      `Skin item \`${context.entry.item.name}\` imports source outside the Skin root.`
    );
  }

  const dependency = context.entries.get(importedFile);
  if (dependency && dependency.item.name !== context.entry.item.name) {
    context.dependencies.add(dependency.item.name);
    return;
  }
  if (importedFile === sourceFile.fileName) return;
  if (isTailwindStyleFile(importedFile)) {
    context.styleFiles.add(importedFile);
    return;
  }
  await analyzeSkinSourceFile(context, importedFile);
}

function diagnoseCycles(items: readonly ResolvedSkinItem[]): void {
  const byName = new Map(items.map((item) => [item.name, item]));
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];

  const visit = (name: string): void => {
    if (active.has(name)) {
      const start = stack.indexOf(name);
      const cycle = [...stack.slice(start), name];
      throw new Error(`Skin dependency cycle: ${cycle.join(' -> ')}.`);
    }
    if (visited.has(name)) return;
    visited.add(name);
    active.add(name);
    stack.push(name);
    for (const dependency of byName.get(name)?.dependencies ?? []) visit(dependency);
    stack.pop();
    active.delete(name);
  };

  for (const item of items) visit(item.name);
}

function createDependencyGroups(): DependencyGroups {
  return new Map([
    ['components', new Set()],
    ['icons', new Set()],
  ]);
}

function mergeGroups(target: DependencyGroups, source: SkinSymbols): void {
  for (const key of ['components', 'icons'] as const) {
    const values = source[key];
    const group = target.get(key);
    if (!group) throw new Error(`Unknown Skin dependency kind \`${key}\`.`);
    for (const value of values) group.add(value);
  }
}

function freezeGroups(groups: ReadonlyMap<SkinDependencyKind, ReadonlySet<string>>): SkinSymbols {
  return {
    components: sortedUnique(groups.get('components') ?? []),
    icons: sortedUnique(groups.get('icons') ?? []),
  };
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareStrings);
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

async function resolveImportedFile(importer: string, source: string): Promise<string | null> {
  const base = resolve(dirname(importer), source);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
  ]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Continue through deterministic TypeScript resolution candidates.
    }
  }
  return null;
}

function isTailwindStyleFile(fileName: string): boolean {
  return fileName.endsWith('.tailwind.ts');
}

function skinPath(rootDir: string, fileName: string): string {
  return `./${relative(rootDir, fileName).split(sep).join('/').replaceAll('\\', '/')}`;
}

function isWithinRoot(rootDir: string, fileName: string): boolean {
  const path = relative(rootDir, fileName);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

function scriptKind(fileName: string): ts.ScriptKind {
  switch (extname(fileName)) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.js':
    case '.mjs':
    case '.cjs':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

function nodeError(sourceFile: ts.SourceFile, node: ts.Node, message: string): Error {
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return new Error(`${sourceFile.fileName}:${location.line + 1}:${location.character + 1}: ${message}`);
}
