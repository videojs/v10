import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { collectModuleReferences, type ModuleReference } from '@videojs/compiler/ast';
import ts from 'typescript';
import type {
  ResolvedSkinCatalog,
  ResolvedSkinItem,
  ResolveSkinCatalogResult,
  SkinCatalog,
  SkinClosure,
  SkinDependencies,
  SkinDiagnostic,
  SkinItem,
} from './types';

type DependencyGroups = Map<string, Set<string>>;

interface NormalizedItem {
  item: SkinItem;
  sourceFile: string;
}

interface MutableDependencies {
  items: Set<string>;
  symbols: DependencyGroups;
}

interface SkinVisitContext {
  entry: NormalizedItem;
  fileName: string;
  rootDir: string;
  entries: ReadonlyMap<string, NormalizedItem>;
  files: Set<string>;
  visited: Set<string>;
  dependencies: MutableDependencies;
  diagnostics: SkinDiagnostic[];
  catalog: SkinCatalog;
}

/**
 * Analyze authored imports while preserving item and file boundaries.
 * Framework builds can bundle this graph, but registry output needs the
 * original files, item edges, and named component symbols.
 */
export async function resolveSkinCatalog(
  catalog: SkinCatalog,
  options: { rootDir: string }
): Promise<ResolveSkinCatalogResult> {
  const rootDir = resolve(options.rootDir);
  const diagnostics: SkinDiagnostic[] = [];
  const normalized = normalizeItems([...catalog.skins, ...catalog.components], rootDir, diagnostics);
  const entries = new Map(normalized.map((entry) => [entry.sourceFile, entry]));
  const items: ResolvedSkinItem[] = [];

  for (const entry of normalized) {
    const dependencies = createMutableDependencies(Object.values(catalog.dependencyModules));
    const files = new Set<string>();
    const visited = new Set<string>();

    await visitSkinSourceFile({
      entry,
      fileName: entry.sourceFile,
      rootDir,
      entries,
      files,
      visited,
      dependencies,
      diagnostics,
      catalog,
    });

    items.push({
      ...entry.item,
      files: [...files].map((fileName) => skinPath(rootDir, fileName)).sort(compareStrings),
      dependencies: freezeDependencies(dependencies),
    });
  }

  items.sort((a, b) => compareStrings(a.name, b.name));
  diagnoseCycles(items, diagnostics);
  return {
    catalog: { resources: catalog.resources, items },
    diagnostics: sortDiagnostics(diagnostics),
  };
}

/** Collect the transitive authored items, files, and symbols needed by one item. */
export function resolveSkinClosure(catalog: ResolvedSkinCatalog, itemName: string): SkinClosure {
  const items = new Map(catalog.items.map((item) => [item.name, item]));
  if (!items.has(itemName)) throw new Error(`Skin item \`${itemName}\` does not exist.`);

  const itemNames: string[] = [];
  const visited = new Set<string>();
  const files = new Set<string>();
  const symbols = new Map<string, Set<string>>();

  const visit = (name: string): void => {
    if (visited.has(name)) return;
    visited.add(name);
    const item = items.get(name);
    if (!item) throw new Error(`Skin item \`${itemName}\` depends on missing item \`${name}\`.`);

    for (const dependency of item.dependencies.itemNames) visit(dependency);
    itemNames.push(name);
    for (const file of item.files) files.add(file);
    mergeGroups(symbols, item.dependencies.symbols);
  };

  visit(itemName);
  return {
    itemNames,
    files: sortedUnique(files),
    symbols: freezeGroups(symbols),
  };
}

function normalizeItems(items: readonly SkinItem[], rootDir: string, diagnostics: SkinDiagnostic[]): NormalizedItem[] {
  const normalized: NormalizedItem[] = [];
  const names = new Set<string>();
  const sources = new Set<string>();

  for (const item of [...items].sort((a, b) => compareStrings(a.name, b.name))) {
    if (names.has(item.name)) {
      diagnostics.push(
        errorDiagnostic('skin-duplicate-name', `Skin item \`${item.name}\` is declared more than once.`)
      );
      continue;
    }
    names.add(item.name);

    const sourceFile = resolve(rootDir, item.source);
    if (!isWithinRoot(rootDir, sourceFile)) {
      diagnostics.push(
        errorDiagnostic(
          'skin-source-outside-root',
          `Skin item \`${item.name}\` source must stay inside the Skin root.`,
          sourceFile
        )
      );
      continue;
    }
    if (sources.has(sourceFile)) {
      diagnostics.push(
        errorDiagnostic(
          'skin-duplicate-source',
          `Skin source \`${skinPath(rootDir, sourceFile)}\` is declared more than once.`,
          sourceFile
        )
      );
      continue;
    }
    sources.add(sourceFile);
    normalized.push({ item, sourceFile });
  }
  return normalized;
}

async function visitSkinSourceFile(context: SkinVisitContext): Promise<void> {
  const { entry, fileName, rootDir, files, visited, diagnostics } = context;
  if (visited.has(fileName)) return;
  visited.add(fileName);

  let sourceText: string;
  try {
    sourceText = await readFile(fileName, 'utf8');
  } catch {
    diagnostics.push(
      errorDiagnostic(
        fileName === entry.sourceFile ? 'skin-source-missing' : 'skin-dependency-missing',
        `Skin item \`${entry.item.name}\` cannot read \`${skinPath(rootDir, fileName)}\`.`,
        fileName
      )
    );
    return;
  }

  files.add(fileName);
  if (!isSourceFile(fileName)) return;
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
  context: SkinVisitContext,
  sourceFile: ts.SourceFile,
  reference: ModuleReference
): void {
  const symbolKind = context.catalog.dependencyModules[reference.source];
  if (symbolKind === undefined) return;
  if (reference.ambiguous) {
    context.diagnostics.push(
      nodeDiagnostic(
        sourceFile,
        reference.node,
        'skin-dependency-ambiguous',
        `Skin item \`${context.entry.item.name}\` must use named imports from \`${reference.source}\` so ${symbolKind} dependencies can be inferred.`
      )
    );
  }
  const target = getOrCreateGroup(context.dependencies.symbols, symbolKind);
  for (const name of reference.names) target.add(name);
}

async function visitRelativeReference(
  context: SkinVisitContext,
  sourceFile: ts.SourceFile,
  reference: ModuleReference
): Promise<void> {
  const importedFile = await resolveImportedFile(context.fileName, reference.source);
  if (!importedFile) {
    context.diagnostics.push(
      nodeDiagnostic(
        sourceFile,
        reference.node,
        'skin-import-missing',
        `Skin item \`${context.entry.item.name}\` cannot resolve \`${reference.source}\`.`
      )
    );
    return;
  }
  if (!isWithinRoot(context.rootDir, importedFile)) {
    context.diagnostics.push(
      nodeDiagnostic(
        sourceFile,
        reference.node,
        'skin-import-outside-root',
        `Skin item \`${context.entry.item.name}\` imports source outside the Skin root.`
      )
    );
    return;
  }

  const dependency = context.entries.get(importedFile);
  if (dependency && dependency.item.name !== context.entry.item.name) {
    context.dependencies.items.add(dependency.item.name);
    return;
  }
  if (isComponentSourceFile(context.rootDir, importedFile) && importedFile !== context.entry.sourceFile) {
    context.diagnostics.push(
      nodeDiagnostic(
        sourceFile,
        reference.node,
        'skin-entry-unregistered',
        `Skin component \`${skinPath(context.rootDir, importedFile)}\` must have an authored Skin item.`
      )
    );
    return;
  }
  await visitSkinSourceFile({ ...context, fileName: importedFile });
}

function diagnoseCycles(items: readonly ResolvedSkinItem[], diagnostics: SkinDiagnostic[]): void {
  const byName = new Map(items.map((item) => [item.name, item]));
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];
  const reported = new Set<string>();

  const visit = (name: string): void => {
    if (active.has(name)) {
      const start = stack.indexOf(name);
      const cycle = [...stack.slice(start), name];
      const key = [...new Set(cycle)].sort(compareStrings).join(':');
      if (!reported.has(key)) {
        reported.add(key);
        diagnostics.push(errorDiagnostic('skin-dependency-cycle', `Skin dependency cycle: ${cycle.join(' -> ')}.`));
      }
      return;
    }
    if (visited.has(name)) return;
    visited.add(name);
    active.add(name);
    stack.push(name);
    for (const dependency of byName.get(name)?.dependencies.itemNames ?? []) visit(dependency);
    stack.pop();
    active.delete(name);
  };

  for (const item of items) visit(item.name);
}

function createMutableDependencies(symbolKinds: Iterable<string>): MutableDependencies {
  return { items: new Set(), symbols: createDependencyGroups(symbolKinds) };
}

function freezeDependencies(dependencies: MutableDependencies): SkinDependencies {
  return {
    itemNames: sortedUnique(dependencies.items),
    symbols: freezeGroups(dependencies.symbols),
  };
}

function createDependencyGroups(keys: Iterable<string> = []): DependencyGroups {
  const groups: DependencyGroups = new Map();
  for (const key of keys) getOrCreateGroup(groups, key);
  return groups;
}

function getOrCreateGroup(groups: DependencyGroups, key: string): Set<string> {
  let values = groups.get(key);
  if (!values) {
    values = new Set();
    groups.set(key, values);
  }
  return values;
}

function mergeGroups(target: DependencyGroups, source: Readonly<Record<string, readonly string[]>>): void {
  for (const [key, values] of Object.entries(source)) {
    const group = getOrCreateGroup(target, key);
    for (const value of values) group.add(value);
  }
}

function freezeGroups(groups: ReadonlyMap<string, ReadonlySet<string>>): Record<string, string[]> {
  return Object.fromEntries(
    [...groups.entries()].sort(([a], [b]) => compareStrings(a, b)).map(([key, values]) => [key, sortedUnique(values)])
  );
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

function isSourceFile(fileName: string): boolean {
  return new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']).has(extname(fileName));
}

function isComponentSourceFile(rootDir: string, fileName: string): boolean {
  return isWithinRoot(resolve(rootDir, 'components'), fileName) && fileName.endsWith('.tsx');
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

function nodeDiagnostic(sourceFile: ts.SourceFile, node: ts.Node, code: string, message: string): SkinDiagnostic {
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return errorDiagnostic(code, message, sourceFile.fileName, location.line + 1, location.character + 1);
}

function errorDiagnostic(code: string, message: string, file?: string, line?: number, column?: number): SkinDiagnostic {
  return {
    level: 'error',
    code,
    message,
    plugin: 'videojs/skins',
    ...(file ? { file } : {}),
    ...(line !== undefined ? { line } : {}),
    ...(column !== undefined ? { column } : {}),
  };
}

function sortDiagnostics(diagnostics: readonly SkinDiagnostic[]): SkinDiagnostic[] {
  return [...diagnostics].sort(
    (a, b) =>
      compareStrings(a.file ?? '', b.file ?? '') ||
      (a.line ?? 0) - (b.line ?? 0) ||
      compareStrings(a.code, b.code) ||
      compareStrings(a.message, b.message)
  );
}
