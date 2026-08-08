import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { collectModuleReferences, type ModuleReference } from '@videojs/compiler/ast';
import ts from 'typescript';
import type {
  RegistryClosure,
  RegistryDefinition,
  RegistryDependencies,
  RegistryDiagnostic,
  RegistryFile,
  RegistryItem,
  RegistryResources,
  ResolvedRegistry,
  ResolvedRegistryItem,
  ResolveRegistryResult,
} from './types';

type MutableGroups = Map<string, Set<string>>;

interface NormalizedItem {
  item: RegistryItem;
  sourceFile: string;
  sourcePath: string;
}

interface MutableDependencies {
  items: Set<string>;
  packages: Set<string>;
  symbols: MutableGroups;
}

interface RegistryVisitContext {
  entry: NormalizedItem;
  fileName: string;
  rootDir: string;
  entries: ReadonlyMap<string, NormalizedItem>;
  files: Set<string>;
  visited: Set<string>;
  dependencies: MutableDependencies;
  diagnostics: RegistryDiagnostic[];
  definition: RegistryDefinition;
}

export async function resolveRegistry(
  definition: RegistryDefinition,
  options: { rootDir: string }
): Promise<ResolveRegistryResult> {
  const rootDir = resolve(options.rootDir);
  const diagnostics: RegistryDiagnostic[] = [];
  const normalized = normalizeItems(definition.items, rootDir, diagnostics);
  const entries = new Map(normalized.map((entry) => [entry.sourceFile, entry]));
  const items: ResolvedRegistryItem[] = [];

  for (const entry of normalized) {
    const dependencies = createMutableDependencies(Object.values(definition.dependencyModules));
    const files = new Set<string>();
    const visited = new Set<string>();

    await visitRegistryFile({
      entry,
      fileName: entry.sourceFile,
      rootDir,
      entries,
      files,
      visited,
      dependencies,
      diagnostics,
      definition,
    });

    items.push({
      ...entry.item,
      files: [...files]
        .map(
          (fileName): RegistryFile => ({
            path: registryPath(rootDir, fileName),
            role: fileName === entry.sourceFile ? 'entry' : 'source',
          })
        )
        .sort((a, b) => compareStrings(a.path, b.path)),
      resources: normalizeGroups(definition.resources),
      dependencies: freezeDependencies(dependencies),
    });
  }

  items.sort((a, b) => compareStrings(a.name, b.name));
  diagnoseCycles(items, diagnostics);
  return { registry: { items }, diagnostics: sortDiagnostics(diagnostics) };
}

export function resolveRegistryClosure(registry: ResolvedRegistry, itemName: string): RegistryClosure {
  const items = new Map(registry.items.map((item) => [item.name, item]));
  if (!items.has(itemName)) throw new Error(`Registry item \`${itemName}\` does not exist.`);

  const itemNames: string[] = [];
  const visited = new Set<string>();
  const files = new Map<string, RegistryFile>();
  const resources = new Map<string, Set<string>>();
  const packages = new Set<string>();
  const symbols = new Map<string, Set<string>>();

  const visit = (name: string): void => {
    if (visited.has(name)) return;
    visited.add(name);
    const item = items.get(name);
    if (!item) throw new Error(`Registry item \`${itemName}\` depends on missing item \`${name}\`.`);

    for (const dependency of item.dependencies.items) visit(dependency);
    itemNames.push(name);
    for (const file of item.files) {
      const previous = files.get(file.path);
      if (!previous || file.role === 'entry') files.set(file.path, file);
    }
    mergeGroups(resources, item.resources);
    for (const dependency of item.dependencies.packages) packages.add(dependency);
    mergeGroups(symbols, item.dependencies.symbols);
  };

  visit(itemName);
  return {
    itemNames,
    files: [...files.values()].sort((a, b) => compareStrings(a.path, b.path)),
    resources: freezeGroups(resources),
    items: itemNames.filter((name) => name !== itemName),
    packages: sortedUnique(packages),
    symbols: freezeGroups(symbols),
  };
}

function normalizeItems(
  items: readonly RegistryItem[],
  rootDir: string,
  diagnostics: RegistryDiagnostic[]
): NormalizedItem[] {
  const normalized: NormalizedItem[] = [];
  const names = new Set<string>();
  const sources = new Set<string>();

  for (const item of [...items].sort((a, b) => compareStrings(a.name, b.name))) {
    if (names.has(item.name)) {
      diagnostics.push(
        errorDiagnostic('registry-duplicate-name', `Registry item \`${item.name}\` is declared more than once.`)
      );
      continue;
    }
    names.add(item.name);

    const sourceFile = resolve(rootDir, item.source);
    if (!isWithinRoot(rootDir, sourceFile)) {
      diagnostics.push(
        errorDiagnostic(
          'registry-source-outside-root',
          `Registry item \`${item.name}\` source must stay inside the Skin root.`,
          sourceFile
        )
      );
      continue;
    }
    if (sources.has(sourceFile)) {
      diagnostics.push(
        errorDiagnostic(
          'registry-duplicate-source',
          `Registry source \`${registryPath(rootDir, sourceFile)}\` is declared more than once.`,
          sourceFile
        )
      );
      continue;
    }
    sources.add(sourceFile);
    normalized.push({ item, sourceFile, sourcePath: registryPath(rootDir, sourceFile) });
  }
  return normalized;
}

async function visitRegistryFile(context: RegistryVisitContext): Promise<void> {
  const { entry, fileName, rootDir, files, visited, diagnostics } = context;
  if (visited.has(fileName)) return;
  visited.add(fileName);

  let sourceText: string;
  try {
    sourceText = await readFile(fileName, 'utf8');
  } catch {
    diagnostics.push(
      errorDiagnostic(
        fileName === entry.sourceFile ? 'registry-source-missing' : 'registry-dependency-missing',
        `Registry item \`${entry.item.name}\` cannot read \`${registryPath(rootDir, fileName)}\`.`,
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
      recordPackageReference(context, sourceFile, reference);
      continue;
    }
    await visitRelativeReference(context, sourceFile, reference);
  }
}

function recordPackageReference(
  context: RegistryVisitContext,
  sourceFile: ts.SourceFile,
  reference: ModuleReference
): void {
  context.dependencies.packages.add(packageName(reference.source));
  const symbolKind = context.definition.dependencyModules[reference.source];
  if (symbolKind === undefined) return;
  if (reference.ambiguous) {
    context.diagnostics.push(
      nodeDiagnostic(
        sourceFile,
        reference.node,
        'registry-dependency-ambiguous',
        `Registry item \`${context.entry.item.name}\` must use named imports from \`${reference.source}\` so ${symbolKind} dependencies can be inferred.`
      )
    );
  }
  const target = getOrCreateGroup(context.dependencies.symbols, symbolKind);
  for (const name of reference.names) target.add(name);
}

async function visitRelativeReference(
  context: RegistryVisitContext,
  sourceFile: ts.SourceFile,
  reference: ModuleReference
): Promise<void> {
  const importedFile = await resolveImportedFile(context.fileName, reference.source);
  if (!importedFile) {
    context.diagnostics.push(
      nodeDiagnostic(
        sourceFile,
        reference.node,
        'registry-import-missing',
        `Registry item \`${context.entry.item.name}\` cannot resolve \`${reference.source}\`.`
      )
    );
    return;
  }
  if (!isWithinRoot(context.rootDir, importedFile)) {
    context.diagnostics.push(
      nodeDiagnostic(
        sourceFile,
        reference.node,
        'registry-import-outside-root',
        `Registry item \`${context.entry.item.name}\` imports source outside the Skin root.`
      )
    );
    return;
  }

  const dependency = context.entries.get(importedFile);
  if (dependency && dependency.item.name !== context.entry.item.name) {
    context.dependencies.items.add(dependency.item.name);
    return;
  }
  if (isRegistryEntryFile(importedFile) && importedFile !== context.entry.sourceFile) {
    context.diagnostics.push(
      nodeDiagnostic(
        sourceFile,
        reference.node,
        'registry-entry-unregistered',
        `Registry source \`${registryPath(context.rootDir, importedFile)}\` must have an authored registry item.`
      )
    );
    return;
  }
  await visitRegistryFile({ ...context, fileName: importedFile });
}

function diagnoseCycles(items: readonly ResolvedRegistryItem[], diagnostics: RegistryDiagnostic[]): void {
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
        diagnostics.push(
          errorDiagnostic('registry-dependency-cycle', `Registry dependency cycle: ${cycle.join(' -> ')}.`)
        );
      }
      return;
    }
    if (visited.has(name)) return;
    visited.add(name);
    active.add(name);
    stack.push(name);
    for (const dependency of byName.get(name)?.dependencies.items ?? []) visit(dependency);
    stack.pop();
    active.delete(name);
  };

  for (const item of items) visit(item.name);
}

function createMutableDependencies(symbolKinds: Iterable<string>): MutableDependencies {
  return { items: new Set(), packages: new Set(), symbols: createMutableGroups(symbolKinds) };
}

function freezeDependencies(dependencies: MutableDependencies): RegistryDependencies {
  return {
    items: sortedUnique(dependencies.items),
    packages: sortedUnique(dependencies.packages),
    symbols: freezeGroups(dependencies.symbols),
  };
}

function createMutableGroups(keys: Iterable<string> = []): MutableGroups {
  const groups: MutableGroups = new Map();
  for (const key of keys) getOrCreateGroup(groups, key);
  return groups;
}

function getOrCreateGroup(groups: MutableGroups, key: string): Set<string> {
  let values = groups.get(key);
  if (!values) {
    values = new Set();
    groups.set(key, values);
  }
  return values;
}

function mergeGroups(target: MutableGroups, source: Readonly<Record<string, readonly string[]>>): void {
  for (const [key, values] of Object.entries(source)) {
    const group = getOrCreateGroup(target, key);
    for (const value of values) group.add(value);
  }
}

function normalizeGroups(groups: RegistryResources): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(groups)
      .sort(([a], [b]) => compareStrings(a, b))
      .map(([key, values]) => [key, sortedUnique(values)])
  );
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

function isRegistryEntryFile(fileName: string): boolean {
  return fileName.endsWith('.skin.tsx') || /[/\\]skins[/\\][^/\\]+[/\\]skin\.tsx$/.test(fileName);
}

function isSourceFile(fileName: string): boolean {
  return new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']).has(extname(fileName));
}

function packageName(source: string): string {
  if (!source.startsWith('@')) return source.split('/')[0]!;
  return source.split('/').slice(0, 2).join('/');
}

function registryPath(rootDir: string, fileName: string): string {
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

function nodeDiagnostic(sourceFile: ts.SourceFile, node: ts.Node, code: string, message: string): RegistryDiagnostic {
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return errorDiagnostic(code, message, sourceFile.fileName, location.line + 1, location.character + 1);
}

function errorDiagnostic(
  code: string,
  message: string,
  file?: string,
  line?: number,
  column?: number
): RegistryDiagnostic {
  return {
    level: 'error',
    code,
    message,
    plugin: 'videojs/skins-registry',
    ...(file ? { file } : {}),
    ...(line !== undefined ? { line } : {}),
    ...(column !== undefined ? { column } : {}),
  };
}

function sortDiagnostics(diagnostics: readonly RegistryDiagnostic[]): RegistryDiagnostic[] {
  return [...diagnostics].sort(
    (a, b) =>
      compareStrings(a.file ?? '', b.file ?? '') ||
      (a.line ?? 0) - (b.line ?? 0) ||
      compareStrings(a.code, b.code) ||
      compareStrings(a.message, b.message)
  );
}
