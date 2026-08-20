import { readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, posix, relative, resolve } from 'node:path';

import { type RegistryItem, registryItemSchema, registrySchema, type Registry as ShadcnRegistry } from 'shadcn/schema';

import type { ComponentMeta } from '../components/meta';
import { stripScriptExtension } from '../ts/utils/source-module';
import { type ImportReplacement, replaceImportSpecifiers } from './analyze';
import {
  collectOwnedModules,
  indexModulesByName,
  type RegistrySourceModule,
  type SourceGraph,
  validateSourceGraph,
} from './graph';
import type { ShadcnRegistryDefinition, ShadcnRegistryFile, ShadcnRegistrySharedItem } from './index';

type PublishedRegistryItemType = Extract<RegistryItem['type'], 'registry:block' | 'registry:component'>;

interface OwnedModule extends RegistrySourceModule {
  readonly outputPath: string;
  readonly target: string;
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
    readonly module?: RegistrySourceModule | undefined;
  }[];
}

interface SharedModule {
  readonly name: string;
  readonly installedImport: string;
}

export interface ShadcnOutputFile {
  readonly path: string;
  readonly content: string;
}

/** Assemble schema-valid Shadcn JSON assets from the host's transformed module graph. */
export async function createShadcnRegistryFiles<Item extends ComponentMeta>(
  graph: SourceGraph<Item>,
  definition: ShadcnRegistryDefinition<Item>
): Promise<ShadcnOutputFile[]> {
  const modules = validateSourceGraph(graph);
  validateDefinition(definition, modules);

  const publishedNames = new Set<string>(definition.items.published);
  const modulesByName = indexModulesByName(modules);
  const shared = await loadSharedItems(graph.root, definition, modules);
  const sharedModules = indexSharedModules(shared, definition);
  const builtItems = definition.items.published.map((name) =>
    buildPublishedItem(name, modulesByName, modules, publishedNames, shared, sharedModules, definition)
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
          ...optionalArray(
            'dependencies',
            unique([
              ...(item.dependencies ?? []),
              ...files.flatMap(({ module }) => (module ? modulePackageDependencies(module) : [])),
            ])
          ),
          ...mergedMeta(definition.meta, item.meta),
        })
      ),
      ...builtItems.map((item) => item.manifest),
    ],
  } satisfies ShadcnRegistry;

  validateRegistryFiles(registry.items);
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

function validateRegistryFiles(items: readonly RegistryItem[]): void {
  const paths = new Map<string, string>();
  const targets = new Map<string, string>();

  for (const item of items) {
    for (const file of item.files ?? []) {
      assertNoCollision(paths, file.path, item.name, 'source path');
      if (file.target) assertNoCollision(targets, file.target, item.name, 'installation target');
    }
  }
}

function validateDefinition(
  definition: ShadcnRegistryDefinition,
  modules: ReadonlyMap<string, RegistrySourceModule>
): void {
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

function buildPublishedItem<Item extends ComponentMeta>(
  name: string,
  modulesByName: ReadonlyMap<string, RegistrySourceModule>,
  modules: ReadonlyMap<string, RegistrySourceModule>,
  publishedNames: ReadonlySet<string>,
  shared: readonly LoadedSharedItem[],
  sharedModules: ReadonlyMap<string, SharedModule>,
  definition: ShadcnRegistryDefinition<Item>
): BuiltItem {
  const root = modulesByName.get(name)!;
  if (!root.meta) throw new Error(`Shadcn published source is missing component metadata: \`${root.id}\`.`);
  const description = definition.items.describe(root.meta as Item);
  const owned = collectOwnedModules(
    root,
    modules,
    publishedNames,
    new Map([...sharedModules].map(([id, item]) => [id, item.name]))
  );
  const layout = createLayout(root, owned.modules, description.type, definition);
  const registryDependencies = new Set<string>(
    [...owned.publishedDependencies, ...owned.sharedDependencies].map(
      (dependency) => `${definition.namespace}/${dependency}`
    )
  );
  const dependencies = new Set<string>();
  const retainedImports = new Set<string>();
  const sourceFiles = new Map<string, string>();
  const files = [...layout.values()]
    .sort((left, right) => left.outputPath.localeCompare(right.outputPath))
    .map((module): ShadcnRegistryFile => {
      const rewritten = rewriteImports(module, layout, modules, publishedNames, sharedModules, definition);
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

function createLayout(
  root: RegistrySourceModule,
  modules: readonly RegistrySourceModule[],
  ownerType: PublishedRegistryItemType,
  definition: ShadcnRegistryDefinition
): ReadonlyMap<string, OwnedModule> {
  if (!root.meta) throw new Error(`Shadcn published source is missing component metadata: \`${root.id}\`.`);
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
  modules: ReadonlyMap<string, RegistrySourceModule>,
  publishedNames: ReadonlySet<string>,
  sharedModules: ReadonlyMap<string, SharedModule>,
  definition: ShadcnRegistryDefinition
): { source: string; imports: string[]; dependencies: string[] } {
  const replacements: ImportReplacement[] = [];
  const imports: string[] = [];
  const dependencies = new Set<string>();

  module.imports.forEach((reference) => {
    const resolvedId = reference.resolvedId;
    const dependency = resolvedId ? modules.get(resolvedId) : undefined;
    let replacement = definition.imports?.[reference.specifier];

    if (!replacement && dependency) {
      const ownedDependency = layout.get(dependency.id);
      if (ownedDependency) {
        replacement = relativeImport(module.target, ownedDependency.target);
      } else if (sharedModules.has(dependency.id)) {
        replacement = sharedModules.get(dependency.id)!.installedImport;
      } else if (dependency.meta && publishedNames.has(dependency.meta.name)) {
        replacement = publishedImport(dependency, definition);
      }
    }

    replacement ??= reference.specifier;
    imports.push(replacement);
    if (replacement !== reference.specifier) replacements.push({ ...reference, replacement });

    if (!dependency && !definition.imports?.[reference.specifier]) {
      const graphId = resolvedId ?? reference.specifier;
      const packageName = packageDependency(graphId) ?? packageDependency(reference.specifier);
      if (packageName) dependencies.add(packageName);
    }
  });

  return {
    source: replaceImportSpecifiers(module.source, replacements),
    imports,
    dependencies: [...dependencies].sort(),
  };
}

function publishedImport(module: RegistrySourceModule, definition: ShadcnRegistryDefinition): string {
  if (!module.meta) throw new Error(`Shadcn published dependency is missing component metadata: \`${module.id}\`.`);
  return posix.join(definition.paths.import, module.meta.name, posix.basename(stripScriptExtension(module.sourcePath)));
}

function relativeImport(importerTarget: string, dependencyTarget: string): string {
  const specifier = posix.relative(posix.dirname(importerTarget), stripScriptExtension(dependencyTarget));
  return specifier.startsWith('.') ? specifier : `./${specifier}`;
}

async function loadSharedItems(
  root: string,
  definition: ShadcnRegistryDefinition,
  modules: ReadonlyMap<string, RegistrySourceModule>
): Promise<LoadedSharedItem[]> {
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
          const id = await realpath(source).catch(() => source);
          const module = modules.get(id);
          return {
            file: {
              path,
              target,
              type: file.type ?? (item.type === 'registry:lib' ? 'registry:lib' : 'registry:file'),
            },
            content: module?.source ?? (await readFile(source, 'utf8')),
            ...(module ? { module } : {}),
          };
        })
      ),
    }))
  );
}

function indexSharedModules(
  items: readonly LoadedSharedItem[],
  definition: ShadcnRegistryDefinition
): ReadonlyMap<string, SharedModule> {
  const modules = new Map<string, SharedModule>();
  const installRoot = normalizePath(definition.paths.install);
  for (const item of items) {
    for (const { file, module } of item.files) {
      if (!module || !file.target) continue;
      const installedPath = stripRoot(normalizePath(file.target), installRoot);
      modules.set(module.id, {
        name: item.definition.name,
        installedImport: posix.join(definition.paths.import, stripScriptExtension(installedPath)),
      });
    }
  }
  return modules;
}

function modulePackageDependencies(module: RegistrySourceModule): string[] {
  return module.imports.flatMap((reference) => {
    const name =
      packageDependency(reference.resolvedId ?? reference.specifier) ?? packageDependency(reference.specifier);
    return name ? [name] : [];
  });
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

function mergedMeta(...values: Array<RegistryItem['meta'] | undefined>): { meta?: RegistryItem['meta'] } {
  const defined = values.filter((value): value is NonNullable<typeof value> => Boolean(value));
  return defined.length ? { meta: Object.assign({}, ...defined) } : {};
}

function optionalList<Key extends string>(key: Key, values: ReadonlySet<string>): Partial<Record<Key, string[]>> {
  const list = [...values].sort();
  return list.length ? ({ [key]: list } as Partial<Record<Key, string[]>>) : {};
}

function optionalArray<Key extends string>(key: Key, values: readonly string[]): Partial<Record<Key, string[]>> {
  return values.length ? ({ [key]: [...values] } as Partial<Record<Key, string[]>>) : {};
}

function validateRelativePath(path: string, label: string): void {
  const normalized = normalizePath(path);
  if (
    !normalized ||
    normalized === '.' ||
    isAbsolute(path) ||
    posix.isAbsolute(normalized) ||
    escapesRoot(normalized)
  ) {
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
  return path ? posix.normalize(toPosix(path)).replace(/^\.\//, '') : '';
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
