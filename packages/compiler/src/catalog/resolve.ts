import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { collectModuleReferences, type ModuleReference } from '../utils/module-references';
import { toPosixPath } from '../utils/path';
import { resolveSourceModule, sourceScriptKind } from '../utils/source-module';
import type {
  CatalogDefinition,
  CatalogImportPattern,
  CatalogImports,
  CatalogItemDefinition,
  CatalogItemName,
} from './define';

export interface CatalogFiles {
  readonly source: readonly string[];
  readonly style: readonly string[];
}

type DefinedItem<Definition extends CatalogDefinition> = Definition['items'][number];

type CatalogResources<Definition extends CatalogDefinition> = Definition extends {
  readonly resources: infer Resources;
}
  ? Resources
  : undefined;

type ImportGroupName<Definition extends CatalogDefinition> = Definition extends {
  readonly imports: infer Imports extends CatalogImports;
}
  ? Imports[keyof Imports]
  : never;

type CatalogReferences<Definition extends CatalogDefinition> = {
  readonly [Name in ImportGroupName<Definition>]: readonly string[];
};

export type CatalogItem<Definition extends CatalogDefinition> = DefinedItem<Definition> & {
  readonly dependencies: readonly string[];
  readonly files: CatalogFiles;
  readonly references: CatalogReferences<Definition>;
};

/** An authored catalog enriched with direct module and item dependency analysis. */
export interface Catalog<Definition extends CatalogDefinition = CatalogDefinition> {
  readonly rootDir: string;
  readonly components: Definition['components'] extends readonly string[]
    ? Definition['components']
    : readonly string[];
  readonly resources: CatalogResources<Definition>;
  readonly items: readonly CatalogItem<Definition>[];
  readonly references: CatalogReferences<Definition>;
}

/** One or more requested catalog items and everything required to compile them. */
export interface CatalogResolution<Definition extends CatalogDefinition = CatalogDefinition> {
  readonly items: readonly CatalogItem<Definition>[];
  readonly files: CatalogFiles;
  readonly references: CatalogReferences<Definition>;
}

type ReferenceGroups = Map<string, Set<string>>;

interface NormalizedItem<Item extends CatalogItemDefinition> {
  item: Item;
  sourceFile: string;
}

interface AnalyzeCatalogItemContext<Definition extends CatalogDefinition> {
  entry: NormalizedItem<DefinedItem<Definition>>;
  rootDir: string;
  entries: ReadonlyMap<string, NormalizedItem<DefinedItem<Definition>>>;
  dependencies: Set<string>;
  files: { source: Set<string>; style: Set<string> };
  references: ReferenceGroups;
  imports: CatalogImports;
  allowedImports: readonly CatalogImportPattern[] | undefined;
  visitedSource: Set<string>;
  visitedStyle: Set<string>;
}

/** Load and analyze every authored catalog item once. */
export async function loadCatalog<const Definition extends CatalogDefinition>(
  definition: Definition,
  options: { rootDir: string }
): Promise<Catalog<Definition>> {
  const rootDir = resolve(options.rootDir);
  const normalized = normalizeItems(definition.items, rootDir) as NormalizedItem<DefinedItem<Definition>>[];
  const entries = new Map(normalized.map((entry) => [entry.sourceFile, entry]));
  const imports = definition.imports ?? {};
  const items: CatalogItem<Definition>[] = [];
  const catalogReferences = createReferenceGroups(imports);

  for (const entry of normalized) {
    const dependencies = new Set<string>();
    const files = { source: new Set<string>(), style: new Set<string>() };
    const references = createReferenceGroups(imports);

    await analyzeCatalogSourceFile(
      {
        entry,
        rootDir,
        entries,
        dependencies,
        files,
        references,
        imports,
        allowedImports: definition.allowedImports,
        visitedSource: new Set(),
        visitedStyle: new Set(),
      },
      entry.sourceFile
    );

    const itemReferences = freezeGroups(references) as CatalogReferences<Definition>;
    mergeGroups(catalogReferences, itemReferences);
    items.push({
      ...entry.item,
      dependencies: sortedUnique(dependencies),
      files: {
        source: sortedUnique(files.source).map((fileName) => catalogPath(rootDir, fileName)),
        style: sortedUnique(files.style).map((fileName) => catalogPath(rootDir, fileName)),
      },
      references: itemReferences,
    });
  }

  items.sort((a, b) => compareStrings(a.name, b.name));
  diagnoseCycles(items);

  return {
    rootDir,
    components: (definition.components ?? []) as Catalog<Definition>['components'],
    resources: definition.resources as CatalogResources<Definition>,
    items,
    references: freezeGroups(catalogReferences) as CatalogReferences<Definition>,
  };
}

/** Resolve requested catalog items together with their transitive dependencies. */
export function resolveCatalog<const Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  itemNames: readonly CatalogItemName<Definition>[]
): CatalogResolution<Definition> {
  const items = new Map(catalog.items.map((item) => [item.name, item]));
  const resolvedItems: CatalogItem<Definition>[] = [];
  const visited = new Set<string>();
  const files = { source: new Set<string>(), style: new Set<string>() };
  const referenceNames = Object.keys(catalog.references);
  const references = new Map(referenceNames.map((name) => [name, new Set<string>()]));

  const visit = (name: string, requestedBy?: string): void => {
    if (visited.has(name)) return;
    const item = items.get(name);
    if (!item) {
      throw new Error(
        requestedBy
          ? `Catalog item \`${requestedBy}\` depends on missing item \`${name}\`.`
          : `Catalog item \`${name}\` does not exist.`
      );
    }

    visited.add(name);
    for (const dependency of item.dependencies) visit(dependency, item.name);
    resolvedItems.push(item);
    for (const file of item.files.source) files.source.add(file);
    for (const file of item.files.style) files.style.add(file);
    mergeGroups(references, item.references);
  };

  for (const itemName of itemNames) visit(itemName);

  return {
    items: resolvedItems,
    files: {
      source: sortedUnique(files.source),
      style: sortedUnique(files.style),
    },
    references: freezeGroups(references) as CatalogReferences<Definition>,
  };
}

function normalizeItems(
  items: readonly CatalogItemDefinition[],
  rootDir: string
): NormalizedItem<CatalogItemDefinition>[] {
  const normalized: NormalizedItem<CatalogItemDefinition>[] = [];
  const names = new Set<string>();
  const sources = new Set<string>();

  for (const item of [...items].sort((a, b) => compareStrings(a.name, b.name))) {
    if (names.has(item.name)) throw new Error(`Catalog item \`${item.name}\` is declared more than once.`);
    names.add(item.name);

    const sourceFile = resolve(rootDir, item.source);
    if (!isWithinRoot(rootDir, sourceFile)) {
      throw new Error(`Catalog item \`${item.name}\` source must stay inside the catalog root.`);
    }
    if (sources.has(sourceFile)) {
      throw new Error(`Catalog source \`${catalogPath(rootDir, sourceFile)}\` is declared more than once.`);
    }
    sources.add(sourceFile);
    normalized.push({ item, sourceFile });
  }

  return normalized;
}

async function analyzeCatalogSourceFile<Definition extends CatalogDefinition>(
  context: AnalyzeCatalogItemContext<Definition>,
  fileName: string
): Promise<void> {
  if (context.visitedSource.has(fileName)) return;
  context.visitedSource.add(fileName);

  const sourceText = await readCatalogSource(context, fileName);
  context.files.source.add(fileName);

  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    sourceScriptKind(fileName)
  );
  for (const reference of collectModuleReferences(sourceFile)) {
    if (!reference.source.startsWith('.')) {
      validatePackageImport(context, sourceFile, reference);
      recordImportReferences(context, sourceFile, reference);
      continue;
    }
    await visitRelativeReference(context, sourceFile, reference);
  }
}

function recordImportReferences<Definition extends CatalogDefinition>(
  context: AnalyzeCatalogItemContext<Definition>,
  sourceFile: ts.SourceFile,
  reference: ModuleReference
): void {
  const groupName = context.imports[reference.source];
  if (groupName === undefined) return;
  if (reference.ambiguous) {
    throw nodeError(
      sourceFile,
      reference.node,
      `Catalog item \`${context.entry.item.name}\` must use named imports from \`${reference.source}\` so ${groupName} references can be collected.`
    );
  }
  const group = context.references.get(groupName);
  if (!group) throw new Error(`Unknown catalog reference group \`${groupName}\`.`);
  for (const name of reference.names) group.add(name);
}

async function visitRelativeReference<Definition extends CatalogDefinition>(
  context: AnalyzeCatalogItemContext<Definition>,
  sourceFile: ts.SourceFile,
  reference: ModuleReference
): Promise<void> {
  const importedFile = resolveSourceModule(sourceFile.fileName, reference.source);
  if (!importedFile) {
    throw nodeError(
      sourceFile,
      reference.node,
      `Catalog item \`${context.entry.item.name}\` cannot resolve \`${reference.source}\`.`
    );
  }
  if (!isWithinRoot(context.rootDir, importedFile)) {
    throw nodeError(
      sourceFile,
      reference.node,
      `Catalog item \`${context.entry.item.name}\` imports source outside the catalog root.`
    );
  }

  const dependency = context.entries.get(importedFile);
  if (dependency && dependency.item.name !== context.entry.item.name) {
    context.dependencies.add(dependency.item.name);
    return;
  }
  if (importedFile === sourceFile.fileName) return;
  if (isStyleDefinitionFile(importedFile)) {
    context.files.style.add(importedFile);
    await validateStyleImports(context, importedFile);
    return;
  }
  await analyzeCatalogSourceFile(context, importedFile);
}

async function validateStyleImports<Definition extends CatalogDefinition>(
  context: AnalyzeCatalogItemContext<Definition>,
  fileName: string
): Promise<void> {
  if (context.visitedStyle.has(fileName)) return;
  context.visitedStyle.add(fileName);

  const sourceText = await readCatalogSource(context, fileName);
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    sourceScriptKind(fileName)
  );

  for (const reference of collectModuleReferences(sourceFile)) {
    if (!reference.source.startsWith('.')) {
      validatePackageImport(context, sourceFile, reference);
      continue;
    }

    const importedFile = resolveSourceModule(fileName, reference.source);
    if (!importedFile) {
      throw nodeError(
        sourceFile,
        reference.node,
        `Catalog item \`${context.entry.item.name}\` cannot resolve \`${reference.source}\`.`
      );
    }
    if (!isWithinRoot(context.rootDir, importedFile)) {
      throw nodeError(
        sourceFile,
        reference.node,
        `Catalog item \`${context.entry.item.name}\` imports source outside the catalog root.`
      );
    }

    await validateStyleImports(context, importedFile);
  }
}

async function readCatalogSource<Definition extends CatalogDefinition>(
  context: AnalyzeCatalogItemContext<Definition>,
  fileName: string
): Promise<string> {
  try {
    return await readFile(fileName, 'utf8');
  } catch {
    throw new Error(
      `Catalog item \`${context.entry.item.name}\` cannot read \`${catalogPath(context.rootDir, fileName)}\`.`
    );
  }
}

function validatePackageImport<Definition extends CatalogDefinition>(
  context: AnalyzeCatalogItemContext<Definition>,
  sourceFile: ts.SourceFile,
  reference: ModuleReference
): void {
  if (!context.allowedImports) return;
  if (Object.hasOwn(context.imports, reference.source)) return;
  if (context.allowedImports.some((pattern) => matchesImport(pattern, reference.source))) return;

  throw nodeError(
    sourceFile,
    reference.node,
    `Catalog item \`${context.entry.item.name}\` imports package \`${reference.source}\`, which is not allowed.`
  );
}

function matchesImport(pattern: CatalogImportPattern, source: string): boolean {
  if (typeof pattern === 'string') return pattern === source;

  pattern.lastIndex = 0;
  return pattern.test(source);
}

function diagnoseCycles<Definition extends CatalogDefinition>(items: readonly CatalogItem<Definition>[]): void {
  const byName = new Map(items.map((item) => [item.name, item]));
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];

  const visit = (name: string): void => {
    if (active.has(name)) {
      const start = stack.indexOf(name);
      throw new Error(`Catalog dependency cycle: ${[...stack.slice(start), name].join(' -> ')}.`);
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

function createReferenceGroups(imports: CatalogImports): ReferenceGroups {
  return new Map([...new Set(Object.values(imports))].map((name) => [name, new Set<string>()]));
}

function mergeGroups(target: ReferenceGroups, source: Readonly<Record<string, readonly string[]>>): void {
  for (const [name, values] of Object.entries(source)) {
    const group = target.get(name);
    if (!group) throw new Error(`Unknown catalog reference group \`${name}\`.`);
    for (const value of values) group.add(value);
  }
}

function freezeGroups(groups: ReferenceGroups): Readonly<Record<string, readonly string[]>> {
  return Object.freeze(
    Object.fromEntries([...groups].map(([name, values]) => [name, Object.freeze(sortedUnique(values))]))
  );
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareStrings);
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isStyleDefinitionFile(fileName: string): boolean {
  return fileName.endsWith('.styles.ts');
}

function catalogPath(rootDir: string, fileName: string): string {
  return `./${toPosixPath(relative(rootDir, fileName))}`;
}

function isWithinRoot(rootDir: string, fileName: string): boolean {
  const path = relative(rootDir, fileName);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

function nodeError(sourceFile: ts.SourceFile, node: ts.Node, message: string): Error {
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return new Error(`${sourceFile.fileName}:${location.line + 1}:${location.character + 1}: ${message}`);
}
