import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, posix, relative, resolve } from 'node:path';

import { type RegistryItem, registryItemSchema, registrySchema, type Registry as ShadcnRegistry } from 'shadcn/schema';
import ts from 'typescript';

import type { ComponentMeta } from '../components/meta';
import { sourceScriptKind, stripScriptExtension } from '../utils/source-module';
import type { ShadcnRegistryDefinition, ShadcnRegistryFile, ShadcnRegistrySharedItem } from './index';

type PublishedRegistryItemType = Extract<RegistryItem['type'], 'registry:block' | 'registry:component'>;

/** One canonical module captured after VJSC transformation. */
export interface ShadcnGraphModule<Item extends ComponentMeta = ComponentMeta> {
  readonly id: string;
  readonly source: string;
  readonly meta: Item;
  readonly importedIds: readonly string[];
}

/** The host-owned module graph used to assemble a Shadcn registry. */
export interface ShadcnGraph<Item extends ComponentMeta = ComponentMeta> {
  readonly root: string;
  readonly modules: ReadonlyMap<string, ShadcnGraphModule<Item>>;
}

interface RegistryModule extends ShadcnGraphModule {
  readonly sourcePath: string;
}

interface OwnedModule extends RegistryModule {
  readonly outputPath: string;
  readonly target: string;
}

interface ImportReference {
  readonly specifier: string;
  readonly start: number;
  readonly end: number;
  readonly quote: string;
}

interface BuiltItem {
  readonly manifest: RegistryItem;
  readonly sourceFiles: ReadonlyMap<string, string>;
}

interface LoadedSharedItem {
  readonly definition: ShadcnRegistrySharedItem;
  readonly files: readonly {
    readonly file: ShadcnRegistryFile;
    readonly content: string;
  }[];
}

export interface ShadcnOutputFile {
  readonly path: string;
  readonly content: string;
}

/** Assemble schema-valid Shadcn JSON assets from the host's transformed module graph. */
export async function createShadcnRegistryFiles<Item extends ComponentMeta>(
  graph: ShadcnGraph<Item>,
  definition: ShadcnRegistryDefinition<Item>
): Promise<ShadcnOutputFile[]> {
  const modules = validateGraph(graph);
  validateDefinition(definition, modules);

  const publishedNames = new Set<string>(definition.items.published);
  const modulesByName = indexModulesByName(modules);
  const shared = await loadSharedItems(graph.root, definition);
  const builtItems = definition.items.published.map((name) =>
    buildPublishedItem(name, modulesByName, modules, publishedNames, shared, definition)
  );
  const registry = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: definition.name,
    homepage: definition.homepage,
    items: [
      ...shared.map(
        ({ definition: item, files }): RegistryItem => ({
          name: item.name,
          type: item.type,
          title: item.title,
          description: item.description,
          files: files.map(({ file }) => file),
          ...(item.dependencies?.length ? { dependencies: unique(item.dependencies) } : {}),
          ...mergedMeta(definition.meta, item.meta),
        })
      ),
      ...builtItems.map((item) => item.manifest),
    ],
  } satisfies ShadcnRegistry;

  registrySchema.parse(registry);

  const contents = new Map<string, string>();
  for (const item of builtItems) {
    for (const [path, content] of item.sourceFiles) addUnique(contents, path, content, 'source');
  }
  for (const item of shared) {
    for (const { file, content } of item.files) addUnique(contents, file.path, content, 'source');
  }

  const assets: ShadcnOutputFile[] = [{ path: 'registry.json', content: JSON.stringify(registry) }];
  for (const item of registry.items) {
    const output = {
      $schema: 'https://ui.shadcn.com/schema/registry-item.json',
      ...item,
      ...(item.files
        ? {
            files: item.files.map((file) => {
              const content = contents.get(file.path);
              if (content === undefined) throw new Error(`Shadcn registry source does not exist: ${file.path}`);
              return { ...file, content };
            }),
          }
        : {}),
    };

    registryItemSchema.parse(output);
    assets.push({ path: `${item.name}.json`, content: JSON.stringify(output) });
  }

  return assets;
}

function validateGraph(graph: ShadcnGraph): ReadonlyMap<string, RegistryModule> {
  if (!isAbsolute(graph.root)) throw new Error(`Shadcn graph root must be absolute: \`${graph.root}\`.`);
  const root = resolve(graph.root);
  const modules = new Map<string, RegistryModule>();

  for (const [key, module] of graph.modules) {
    if (!isAbsolute(module.id)) throw new Error(`Shadcn graph module ID must be absolute: \`${module.id}\`.`);
    const id = resolve(module.id);
    if (key !== module.id || id !== module.id) {
      throw new Error(`Shadcn graph module must use its canonical ID as its map key: \`${module.id}\`.`);
    }
    const sourcePath = toPosix(relative(root, id));
    if (!sourcePath || escapesRoot(sourcePath)) {
      throw new Error(`Shadcn graph module must be inside the graph root: \`${module.id}\`.`);
    }
    if (!module.meta.name) throw new Error(`Shadcn graph module has an empty component name: \`${module.id}\`.`);
    assertMetaRemoved(module);
    if (modules.has(id)) throw new Error(`Shadcn graph module is captured twice: \`${id}\`.`);
    modules.set(id, { ...module, sourcePath });
  }

  return modules;
}

function validateDefinition(definition: ShadcnRegistryDefinition, modules: ReadonlyMap<string, RegistryModule>): void {
  for (const [name, value] of Object.entries(definition.paths)) {
    if (name === 'import') continue;
    validateRelativePath(value, `Shadcn registry ${name} path`);
  }
  if (!definition.paths.import || definition.paths.import.startsWith('.')) {
    throw new Error(`Shadcn registry import path must be an absolute module specifier.`);
  }

  const byName = indexModulesByName(modules);
  const names = new Set<string>();
  for (const name of definition.items.published) {
    validateItemName(name);
    if (names.has(name)) throw new Error(`Shadcn registry item \`${name}\` is published twice.`);
    if (!byName.has(name)) throw new Error(`Shadcn registry references missing component \`${name}\`.`);
    names.add(name);
  }
  for (const item of definition.items.shared ?? []) {
    validateItemName(item.name);
    if (names.has(item.name)) throw new Error(`Shadcn registry item \`${item.name}\` is declared twice.`);
    names.add(item.name);
    for (const file of item.files) {
      validateRelativePath(file.source, `Shadcn shared source path`);
      validateRelativePath(file.path ?? file.source, `Shadcn shared output path`);
      validateRelativePath(file.target ?? file.path ?? file.source, `Shadcn shared installation target`);
    }
  }
}

function indexModulesByName(modules: ReadonlyMap<string, RegistryModule>): ReadonlyMap<string, RegistryModule> {
  const indexed = new Map<string, RegistryModule>();
  for (const module of modules.values()) {
    const previous = indexed.get(module.meta.name);
    if (previous) {
      throw new Error(`Component \`${module.meta.name}\` is declared by both \`${previous.id}\` and \`${module.id}\`.`);
    }
    indexed.set(module.meta.name, module);
  }
  return indexed;
}

function buildPublishedItem<Item extends ComponentMeta>(
  name: string,
  modulesByName: ReadonlyMap<string, RegistryModule>,
  modules: ReadonlyMap<string, RegistryModule>,
  publishedNames: ReadonlySet<string>,
  shared: readonly LoadedSharedItem[],
  definition: ShadcnRegistryDefinition<Item>
): BuiltItem {
  const root = modulesByName.get(name)!;
  const description = definition.items.describe(root.meta as Item);
  const owned = collectOwnedModules(root, modules, publishedNames);
  const layout = createLayout(root, owned.modules, description.type, definition);
  const registryDependencies = new Set<string>(
    [...owned.publishedDependencies].map((dependency) => `${definition.namespace}/${dependency}`)
  );
  const dependencies = new Set<string>();
  const retainedImports = new Set<string>();
  const sourceFiles = new Map<string, string>();
  const files = [...layout.values()]
    .sort((left, right) => left.outputPath.localeCompare(right.outputPath))
    .map((module): ShadcnRegistryFile => {
      const rewritten = rewriteImports(module, layout, modules, publishedNames, definition);
      for (const specifier of rewritten.imports) retainedImports.add(specifier);
      for (const dependency of rewritten.dependencies) dependencies.add(dependency);
      const path = posix.join(normalizePath(definition.paths.output), module.outputPath);
      addUnique(sourceFiles, path, rewritten.source, 'source');
      return { path, target: module.target, type: 'registry:component' };
    });

  for (const sharedItem of shared) {
    if (isRequiredBy(sharedItem.definition.requiredBy, retainedImports)) {
      registryDependencies.add(`${definition.namespace}/${sharedItem.definition.name}`);
    }
  }

  const { meta, ...itemDescription } = description;
  return {
    sourceFiles,
    manifest: {
      name,
      ...itemDescription,
      files,
      ...optionalList('dependencies', dependencies),
      registryDependencies: [...registryDependencies].sort(),
      ...mergedMeta(definition.meta, meta),
    },
  };
}

function collectOwnedModules(
  root: RegistryModule,
  modules: ReadonlyMap<string, RegistryModule>,
  publishedNames: ReadonlySet<string>
): { modules: RegistryModule[]; publishedDependencies: Set<string> } {
  const owned = new Map<string, RegistryModule>();
  const publishedDependencies = new Set<string>();

  const visit = (module: RegistryModule): void => {
    if (owned.has(module.id)) return;
    owned.set(module.id, module);

    for (const importedId of module.importedIds) {
      const dependency = modules.get(cleanModuleId(importedId));
      if (!dependency) continue;
      if (dependency.id !== root.id && publishedNames.has(dependency.meta.name)) {
        publishedDependencies.add(dependency.meta.name);
      } else {
        visit(dependency);
      }
    }
  };

  visit(root);
  return { modules: [...owned.values()], publishedDependencies };
}

function createLayout(
  root: RegistryModule,
  modules: readonly RegistryModule[],
  ownerType: PublishedRegistryItemType,
  definition: ShadcnRegistryDefinition
): ReadonlyMap<string, OwnedModule> {
  const layout = new Map<string, OwnedModule>();
  const outputPaths = new Map<string, string>();
  const targets = new Map<string, string>();
  const sourceRoot = normalizePath(definition.paths.source);

  for (const module of modules) {
    const relativeToEntry = toPosix(relative(dirname(root.id), module.id));
    const itemPath =
      module.id === root.id
        ? posix.basename(module.sourcePath)
        : escapesRoot(relativeToEntry)
          ? posix.join('internal', module.sourcePath)
          : relativeToEntry;
    const outputPath =
      ownerType === 'registry:block'
        ? posix.join(sourceRoot, itemPath)
        : posix.join(sourceRoot, 'components', root.meta.name, itemPath);
    const relativeOutput = stripRoot(outputPath, sourceRoot);
    const target =
      ownerType === 'registry:block'
        ? posix.join(normalizePath(definition.paths.install), root.meta.name, relativeOutput)
        : relativeOutput.startsWith('components/')
          ? posix.join(normalizePath(definition.paths.install), relativeOutput.replace(/^components\//, ''))
          : posix.join(normalizePath(definition.paths.install), relativeOutput);

    assertNoCollision(outputPaths, outputPath, module.id, 'output');
    assertNoCollision(targets, target, module.id, 'installation target');
    layout.set(module.id, { ...module, outputPath, target });
  }

  return layout;
}

function rewriteImports(
  module: OwnedModule,
  layout: ReadonlyMap<string, OwnedModule>,
  modules: ReadonlyMap<string, RegistryModule>,
  publishedNames: ReadonlySet<string>,
  definition: ShadcnRegistryDefinition
): { source: string; imports: string[]; dependencies: string[] } {
  const references = collectImportReferences(module.source, module.id);
  const replacements: Array<ImportReference & { replacement: string }> = [];
  const imports: string[] = [];
  const dependencies = new Set<string>();

  references.forEach((reference, index) => {
    const resolvedId = resolveImportedId(module, reference.specifier, index, modules);
    const dependency = resolvedId ? modules.get(resolvedId) : undefined;
    let replacement = definition.imports?.[reference.specifier];

    if (!replacement && dependency) {
      const ownedDependency = layout.get(dependency.id);
      if (ownedDependency) {
        replacement = relativeImport(module.target, ownedDependency.target);
      } else if (publishedNames.has(dependency.meta.name)) {
        replacement = publishedImport(dependency, definition);
      }
    }

    replacement ??= reference.specifier;
    imports.push(replacement);
    if (replacement !== reference.specifier) replacements.push({ ...reference, replacement });

    if (!dependency && !definition.imports?.[reference.specifier]) {
      const graphId = resolvedId ?? module.importedIds[index] ?? reference.specifier;
      const packageName = packageDependency(graphId) ?? packageDependency(reference.specifier);
      if (packageName) dependencies.add(packageName);
    }
  });

  let source = module.source;
  for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    source =
      source.slice(0, replacement.start) +
      replacement.quote +
      escapeSpecifier(replacement.replacement, replacement.quote) +
      replacement.quote +
      source.slice(replacement.end);
  }
  return { source, imports, dependencies: [...dependencies].sort() };
}

function resolveImportedId(
  module: ShadcnGraphModule,
  specifier: string,
  index: number,
  modules: ReadonlyMap<string, RegistryModule>
): string | undefined {
  if (specifier.startsWith('.')) {
    const candidate = resolve(dirname(module.id), specifier);
    const match = module.importedIds
      .map(cleanModuleId)
      .find(
        (id) =>
          id === candidate ||
          stripScriptExtension(id) === candidate ||
          stripScriptExtension(id) === stripScriptExtension(candidate) ||
          stripScriptExtension(id) === posix.join(toPosix(candidate), 'index')
      );
    if (match) return match;
  }
  if (module.importedIds.includes(specifier)) return specifier;

  const ordered = module.importedIds[index];
  if (!ordered) return undefined;
  const id = cleanModuleId(ordered);
  return modules.has(id) || ordered === specifier ? id : undefined;
}

function publishedImport(module: RegistryModule, definition: ShadcnRegistryDefinition): string {
  return posix.join(definition.paths.import, module.meta.name, posix.basename(stripScriptExtension(module.sourcePath)));
}

function relativeImport(importerTarget: string, dependencyTarget: string): string {
  const specifier = posix.relative(posix.dirname(importerTarget), stripScriptExtension(dependencyTarget));
  return specifier.startsWith('.') ? specifier : `./${specifier}`;
}

async function loadSharedItems(root: string, definition: ShadcnRegistryDefinition): Promise<LoadedSharedItem[]> {
  const sourceRoot = normalizePath(definition.paths.source);
  const outputRoot = normalizePath(definition.paths.output);
  const installRoot = normalizePath(definition.paths.install);

  return Promise.all(
    (definition.items.shared ?? []).map(async (item) => ({
      definition: item,
      files: await Promise.all(
        item.files.map(async (file) => {
          const source = resolve(root, file.source);
          const relativeSource = toPosix(relative(root, source));
          if (!relativeSource || escapesRoot(relativeSource)) {
            throw new Error(`Shadcn shared source must be inside the graph root: \`${file.source}\`.`);
          }
          const relativePath = normalizePath(file.path ?? file.source);
          const path = posix.join(outputRoot, sourceRoot, relativePath);
          const target = posix.join(installRoot, normalizePath(file.target ?? relativePath));
          return {
            file: {
              path,
              target,
              type: file.type ?? (item.type === 'registry:lib' ? 'registry:lib' : 'registry:file'),
            },
            content: await readFile(source, 'utf8'),
          };
        })
      ),
    }))
  );
}

function collectImportReferences(source: string, fileName: string): ImportReference[] {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, sourceScriptKind(fileName));
  const references: ImportReference[] = [];
  const visit = (node: ts.Node): void => {
    const literal = moduleSpecifier(node);
    if (literal) {
      const start = literal.getStart(sourceFile);
      references.push({
        specifier: literal.text,
        start,
        end: literal.getEnd(),
        quote: source[start] === '`' ? '`' : source[start] === '"' ? '"' : "'",
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return references;
}

function moduleSpecifier(node: ts.Node): ts.StringLiteralLike | undefined {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier) ? node.moduleSpecifier : undefined;
  }
  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1 &&
    ts.isStringLiteralLike(node.arguments[0]!)
  ) {
    return node.arguments[0];
  }
  return undefined;
}

function assertMetaRemoved(module: ShadcnGraphModule): void {
  const sourceFile = ts.createSourceFile(
    module.id,
    module.source,
    ts.ScriptTarget.Latest,
    true,
    sourceScriptKind(module.id)
  );
  for (const statement of sourceFile.statements) {
    if (
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) &&
      statement.declarationList.declarations.some(
        (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'meta'
      )
    ) {
      throw new Error(`Component metadata remains in transformed Shadcn source: \`${module.id}\`.`);
    }
  }
}

function isRequiredBy(requirement: ShadcnRegistrySharedItem['requiredBy'], imports: ReadonlySet<string>): boolean {
  if (requirement === 'all') return true;
  return requirement?.imports.some((specifier) => imports.has(specifier)) ?? false;
}

function packageDependency(id: string): string | undefined {
  if (
    !id ||
    isAbsolute(id) ||
    id.startsWith('.') ||
    id.startsWith('/') ||
    id.startsWith('#') ||
    id.startsWith('@/') ||
    id.includes('://') ||
    id.startsWith('node:')
  ) {
    return undefined;
  }
  const segments = id.split('/');
  if (id.startsWith('@'))
    return segments.length >= 2 && segments[0]!.length > 1 ? `${segments[0]}/${segments[1]}` : undefined;
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(segments[0]!) ? segments[0] : undefined;
}

function cleanModuleId(id: string): string {
  const query = id.indexOf('?');
  return query === -1 ? id : id.slice(0, query);
}

function escapeSpecifier(specifier: string, quote: string): string {
  return specifier.replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`);
}

function mergedMeta(...values: Array<RegistryItem['meta'] | undefined>): { meta?: RegistryItem['meta'] } {
  const defined = values.filter((value): value is NonNullable<typeof value> => Boolean(value));
  return defined.length ? { meta: Object.assign({}, ...defined) } : {};
}

function optionalList<Key extends string>(key: Key, values: ReadonlySet<string>): Partial<Record<Key, string[]>> {
  const list = [...values].sort();
  return list.length ? ({ [key]: list } as Partial<Record<Key, string[]>>) : {};
}

function validateRelativePath(path: string, label: string): void {
  const normalized = normalizePath(path);
  if (!normalized || isAbsolute(path) || escapesRoot(normalized)) {
    throw new Error(`${label} must be a non-empty relative path: \`${path}\`.`);
  }
}

function validateItemName(name: string): void {
  if (!name || name === '.' || name === '..' || name.includes('/') || name.includes('\\')) {
    throw new Error(`Shadcn registry item has an invalid name: \`${name}\`.`);
  }
}

function assertNoCollision(paths: Map<string, string>, path: string, id: string, kind: string): void {
  const previous = paths.get(path);
  if (previous && previous !== id) {
    throw new Error(`Shadcn registry ${kind} collision: \`${previous}\` and \`${id}\` both map to \`${path}\`.`);
  }
  paths.set(path, id);
}

function addUnique(files: Map<string, string>, path: string, content: string, kind: string): void {
  const previous = files.get(path);
  if (previous !== undefined && previous !== content)
    throw new Error(`Shadcn registry ${kind} collision: \`${path}\`.`);
  files.set(path, content);
}

function stripRoot(path: string, root: string): string {
  const prefix = `${normalizePath(root)}/`;
  if (!path.startsWith(prefix)) throw new Error(`Shadcn registry path \`${path}\` must be inside \`${root}\`.`);
  return path.slice(prefix.length);
}

function normalizePath(path: string): string {
  return toPosix(path).replace(/^\.\//, '');
}

function escapesRoot(path: string): boolean {
  return path === '..' || path.startsWith('../');
}

function toPosix(path: string): string {
  return path.replaceAll('\\', '/');
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}
