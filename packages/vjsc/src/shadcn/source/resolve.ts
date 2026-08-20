import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { discoverVjscModules } from '../../meta';
import { collectModuleReferences, type ModuleReference } from '../../utils/module-references';
import { toPosixPath } from '../../utils/path';
import { resolveSourceModule, sourceScriptKind } from '../../utils/source-module';
import type {
  SourceDefinition,
  SourceImportPattern,
  SourceImports,
  SourceItemDefinition,
  SourceItemName,
} from './define';

export interface SourceFiles {
  readonly source: readonly string[];
  readonly style: readonly string[];
}

type DefinedItem<Definition extends SourceDefinition> = Definition['items'][number];

type SourceResources<Definition extends SourceDefinition> = Definition extends {
  readonly resources: infer Resources;
}
  ? Resources
  : undefined;

type ImportGroupName<Definition extends SourceDefinition> = Definition extends {
  readonly imports: infer Imports extends SourceImports;
}
  ? Imports[keyof Imports]
  : never;

type SourceReferences<Definition extends SourceDefinition> = {
  readonly [Name in ImportGroupName<Definition>]: readonly string[];
};

export type SourceItem<Definition extends SourceDefinition> = DefinedItem<Definition> & {
  readonly dependencies: readonly string[];
  readonly files: SourceFiles;
  readonly references: SourceReferences<Definition>;
};

/** An authored source enriched with direct module and item dependency analysis. */
export interface Source<Definition extends SourceDefinition = SourceDefinition> {
  readonly rootDir: string;
  readonly resources: SourceResources<Definition>;
  readonly items: readonly SourceItem<Definition>[];
  readonly references: SourceReferences<Definition>;
}

/** One or more requested source items and everything required to compile them. */
export interface SourceResolution<Definition extends SourceDefinition = SourceDefinition> {
  readonly items: readonly SourceItem<Definition>[];
  readonly files: SourceFiles;
  readonly references: SourceReferences<Definition>;
}

type ReferenceGroups = Map<string, Set<string>>;

interface NormalizedItem<Item extends SourceItemDefinition> {
  item: Item;
  sourceFile: string;
}

interface AnalyzeSourceItemContext<Definition extends SourceDefinition> {
  entry: NormalizedItem<DefinedItem<Definition>>;
  rootDir: string;
  entries: ReadonlyMap<string, NormalizedItem<DefinedItem<Definition>>>;
  dependencies: Set<string>;
  files: { source: Set<string>; style: Set<string> };
  references: ReferenceGroups;
  imports: SourceImports;
  allowedImports: readonly SourceImportPattern[] | undefined;
  visitedSource: Set<string>;
  visitedStyle: Set<string>;
}

/** Load and analyze every authored source item once. */
export async function loadSource<const Definition extends SourceDefinition>(
  definition: Definition,
  options: { rootDir: string }
): Promise<Source<Definition>> {
  const rootDir = resolve(options.rootDir);
  const definitionItems =
    'discovery' in definition
      ? discoverVjscModules(definition.discovery as Parameters<typeof discoverVjscModules>[0])
      : definition.items;
  const normalized = normalizeItems(definitionItems, rootDir) as NormalizedItem<DefinedItem<Definition>>[];
  const entries = new Map(normalized.map((entry) => [entry.sourceFile, entry]));
  const imports = definition.imports ?? {};
  const items: SourceItem<Definition>[] = [];
  const sourceReferences = createReferenceGroups(imports);

  for (const entry of normalized) {
    const dependencies = new Set<string>();
    const files = { source: new Set<string>(), style: new Set<string>() };
    const references = createReferenceGroups(imports);

    await analyzeSourceFile(
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

    const itemReferences = freezeGroups(references) as SourceReferences<Definition>;
    mergeGroups(sourceReferences, itemReferences);
    items.push({
      ...entry.item,
      dependencies: sortedUnique(dependencies),
      files: {
        source: sortedUnique(files.source).map((fileName) => sourcePath(rootDir, fileName)),
        style: sortedUnique(files.style).map((fileName) => sourcePath(rootDir, fileName)),
      },
      references: itemReferences,
    });
  }

  items.sort((a, b) => compareStrings(a.name, b.name));
  diagnoseCycles(items);

  return {
    rootDir,
    resources: definition.resources as SourceResources<Definition>,
    items,
    references: freezeGroups(sourceReferences) as SourceReferences<Definition>,
  };
}

/** Resolve requested source items together with their transitive dependencies. */
export function resolveSource<const Definition extends SourceDefinition>(
  source: Source<Definition>,
  itemNames: readonly SourceItemName<Definition>[]
): SourceResolution<Definition> {
  const items = new Map(source.items.map((item) => [item.name, item]));
  const resolvedItems: SourceItem<Definition>[] = [];
  const visited = new Set<string>();
  const files = { source: new Set<string>(), style: new Set<string>() };
  const referenceNames = Object.keys(source.references);
  const references = new Map(referenceNames.map((name) => [name, new Set<string>()]));

  const visit = (name: string, requestedBy?: string): void => {
    if (visited.has(name)) return;
    const item = items.get(name);
    if (!item) {
      throw new Error(
        requestedBy
          ? `Source item \`${requestedBy}\` depends on missing item \`${name}\`.`
          : `Source item \`${name}\` does not exist.`
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
    references: freezeGroups(references) as SourceReferences<Definition>,
  };
}

function normalizeItems(
  items: readonly SourceItemDefinition[],
  rootDir: string
): NormalizedItem<SourceItemDefinition>[] {
  const normalized: NormalizedItem<SourceItemDefinition>[] = [];
  const names = new Set<string>();
  const sources = new Set<string>();

  for (const item of [...items].sort((a, b) => compareStrings(a.name, b.name))) {
    if (names.has(item.name)) throw new Error(`Source item \`${item.name}\` is declared more than once.`);
    names.add(item.name);

    const sourceFile = resolve(rootDir, item.source);
    if (!isWithinRoot(rootDir, sourceFile)) {
      throw new Error(`Source item \`${item.name}\` source must stay inside the source root.`);
    }
    if (sources.has(sourceFile)) {
      throw new Error(`Source source \`${sourcePath(rootDir, sourceFile)}\` is declared more than once.`);
    }
    sources.add(sourceFile);
    normalized.push({ item, sourceFile });
  }

  return normalized;
}

async function analyzeSourceFile<Definition extends SourceDefinition>(
  context: AnalyzeSourceItemContext<Definition>,
  fileName: string
): Promise<void> {
  if (context.visitedSource.has(fileName)) return;
  context.visitedSource.add(fileName);

  const sourceText = await readSourceFile(context, fileName);
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

function recordImportReferences<Definition extends SourceDefinition>(
  context: AnalyzeSourceItemContext<Definition>,
  sourceFile: ts.SourceFile,
  reference: ModuleReference
): void {
  const groupName = context.imports[reference.source];
  if (groupName === undefined) return;
  if (reference.ambiguous) {
    throw nodeError(
      sourceFile,
      reference.node,
      `Source item \`${context.entry.item.name}\` must use named imports from \`${reference.source}\` so ${groupName} references can be collected.`
    );
  }
  const group = context.references.get(groupName);
  if (!group) throw new Error(`Unknown source reference group \`${groupName}\`.`);
  for (const name of reference.names) group.add(name);
}

async function visitRelativeReference<Definition extends SourceDefinition>(
  context: AnalyzeSourceItemContext<Definition>,
  sourceFile: ts.SourceFile,
  reference: ModuleReference
): Promise<void> {
  const importedFile = resolveSourceModule(sourceFile.fileName, reference.source);
  if (!importedFile) {
    throw nodeError(
      sourceFile,
      reference.node,
      `Source item \`${context.entry.item.name}\` cannot resolve \`${reference.source}\`.`
    );
  }
  if (!isWithinRoot(context.rootDir, importedFile)) {
    throw nodeError(
      sourceFile,
      reference.node,
      `Source item \`${context.entry.item.name}\` imports source outside the source root.`
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
  await analyzeSourceFile(context, importedFile);
}

async function validateStyleImports<Definition extends SourceDefinition>(
  context: AnalyzeSourceItemContext<Definition>,
  fileName: string
): Promise<void> {
  if (context.visitedStyle.has(fileName)) return;
  context.visitedStyle.add(fileName);

  const sourceText = await readSourceFile(context, fileName);
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
        `Source item \`${context.entry.item.name}\` cannot resolve \`${reference.source}\`.`
      );
    }
    if (!isWithinRoot(context.rootDir, importedFile)) {
      throw nodeError(
        sourceFile,
        reference.node,
        `Source item \`${context.entry.item.name}\` imports source outside the source root.`
      );
    }

    await validateStyleImports(context, importedFile);
  }
}

async function readSourceFile<Definition extends SourceDefinition>(
  context: AnalyzeSourceItemContext<Definition>,
  fileName: string
): Promise<string> {
  try {
    return await readFile(fileName, 'utf8');
  } catch {
    throw new Error(
      `Source item \`${context.entry.item.name}\` cannot read \`${sourcePath(context.rootDir, fileName)}\`.`
    );
  }
}

function validatePackageImport<Definition extends SourceDefinition>(
  context: AnalyzeSourceItemContext<Definition>,
  sourceFile: ts.SourceFile,
  reference: ModuleReference
): void {
  if (!context.allowedImports) return;
  if (Object.hasOwn(context.imports, reference.source)) return;
  if (context.allowedImports.some((pattern) => matchesImport(pattern, reference.source))) return;

  throw nodeError(
    sourceFile,
    reference.node,
    `Source item \`${context.entry.item.name}\` imports package \`${reference.source}\`, which is not allowed.`
  );
}

function matchesImport(pattern: SourceImportPattern, source: string): boolean {
  if (typeof pattern === 'string') return pattern === source;

  pattern.lastIndex = 0;
  return pattern.test(source);
}

function diagnoseCycles<Definition extends SourceDefinition>(items: readonly SourceItem<Definition>[]): void {
  const byName = new Map(items.map((item) => [item.name, item]));
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];

  const visit = (name: string): void => {
    if (active.has(name)) {
      const start = stack.indexOf(name);
      throw new Error(`Source dependency cycle: ${[...stack.slice(start), name].join(' -> ')}.`);
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

function createReferenceGroups(imports: SourceImports): ReferenceGroups {
  return new Map([...new Set(Object.values(imports))].map((name) => [name, new Set<string>()]));
}

function mergeGroups(target: ReferenceGroups, source: Readonly<Record<string, readonly string[]>>): void {
  for (const [name, values] of Object.entries(source)) {
    const group = target.get(name);
    if (!group) throw new Error(`Unknown source reference group \`${name}\`.`);
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

function sourcePath(rootDir: string, fileName: string): string {
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
