import { readFile, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, posix, relative, resolve } from 'node:path';

import { type RegistryItem, registryItemSchema, registrySchema, type Registry as ShadcnRegistry } from 'shadcn/schema';

import type { ComponentMeta } from '../components/meta';
import { parseModuleId } from '../utils/module-id';
import { escapesRoot, isInsideRoot, toPosixPath } from '../utils/path';
import { type ImportReplacement, replaceImportSpecifiers } from './analyze';
import {
  collectOwnedModules,
  type PublishedModule,
  type RegistrySourceModule,
  type SourceGraph,
  validateSourceGraph,
} from './graph';
import type { ShadcnItem, ShadcnPluginOptions, ShadcnRegistryFile, ShadcnStyle } from './types';

interface OwnedModule<Item extends ComponentMeta = ComponentMeta> extends RegistrySourceModule<Item> {
  readonly outputPath: string;
  readonly target: string;
}

interface BuiltItem {
  readonly manifest: RegistryItem;
  readonly sourceFiles: ReadonlyMap<string, string>;
}

interface LoadedStyle {
  readonly manifest: RegistryItem;
  readonly files: readonly { readonly file: ShadcnRegistryFile; readonly content: string }[];
}

export interface ShadcnOutputFile {
  readonly path: string;
  readonly content: string;
}

/** Assemble schema-valid Shadcn JSON assets from the host's transformed module graph. */
export async function createShadcnRegistryFiles<Item extends ComponentMeta>(
  graph: SourceGraph<Item>,
  options: ShadcnPluginOptions<Item>
): Promise<ShadcnOutputFile[]> {
  const modules = validateSourceGraph(graph);

  validateOptions(options);
  const published = describePublishedModules(modules, options);
  const style = options.styles ? await loadStyle(graph.root, options.styles, options) : undefined;
  const builtItems = [...published.values()]
    .sort((left, right) => left.item.name.localeCompare(right.item.name))
    .map((publication) => buildPublishedItem(publication, modules, published, style, options));
  const registry = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: options.name,
    homepage: options.homepage,
    items: [...(style ? [style.manifest] : []), ...builtItems.map((item) => item.manifest)],
  } satisfies ShadcnRegistry;

  validateRegistryFiles(registry.items);
  registrySchema.parse(registry);

  const contents = new Map<string, string>();

  for (const item of builtItems) {
    for (const [path, content] of item.sourceFiles) addUnique(contents, path, content, 'source');
  }

  for (const { file, content } of style?.files ?? []) addUnique(contents, file.path, content, 'source');

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

function describePublishedModules<Item extends ComponentMeta>(
  modules: ReadonlyMap<string, RegistrySourceModule<Item>>,
  options: ShadcnPluginOptions<Item>
): ReadonlyMap<string, PublishedModule<Item>> {
  const published = new Map<string, PublishedModule<Item>>();
  const names = new Map<string, string>();
  const configurable = [...modules.values()].map((module) => ({
    id: module.id,
    filename: module.filename,
    transform: Object.fromEntries(parseModuleId(module.id).parameters),
    meta: module.meta,
  }));

  for (const item of options.publish.items(configurable)) {
    const module = modules.get(item.module.id);
    if (!module) throw new Error(`Shadcn item \`${item.name}\` references an unknown module: \`${item.module.id}\`.`);

    validateItemName(item.name);

    if (item.filename) validateRelativePath(item.filename, `Shadcn item ${item.name} filename`);

    const previous = names.get(item.name);

    if (previous) {
      throw new Error(`Shadcn item \`${item.name}\` is described by both \`${previous}\` and \`${module.id}\`.`);
    }

    names.set(item.name, module.id);
    published.set(module.id, { module, item });
  }

  return published;
}

function buildPublishedItem<Item extends ComponentMeta>(
  publication: PublishedModule<Item>,
  modules: ReadonlyMap<string, RegistrySourceModule<Item>>,
  published: ReadonlyMap<string, PublishedModule<Item>>,
  style: LoadedStyle | undefined,
  options: ShadcnPluginOptions<Item>
): BuiltItem {
  const { item, module: root } = publication;
  const owned = collectOwnedModules(root, modules, published);
  const layout = createLayout(root, owned.modules, item, options);
  const registryDependencies = new Set<string>(
    [...owned.publishedDependencies].map((dependency) => `${options.namespace}/${dependency}`)
  );

  if (style && item.type !== 'registry:lib') registryDependencies.add(`${options.namespace}/${style.manifest.name}`);

  const dependencies = new Set<string>();
  const jsxImportSource = moduleJsxImportSource(root.source);

  if (jsxImportSource) dependencies.add(jsxImportSource);

  const sourceFiles = new Map<string, string>();
  const files = [...layout.values()]
    .sort((left, right) => left.outputPath.localeCompare(right.outputPath))
    .map((module): ShadcnRegistryFile => {
      const rewritten = rewriteImports(module, layout, modules, published, options);

      for (const dependency of rewritten.dependencies) dependencies.add(dependency);

      const path = posix.join(normalizePath(options.paths.output), module.outputPath);

      addUnique(sourceFiles, path, rewritten.source, 'source');
      return {
        path,
        target: module.target,
        type: item.type === 'registry:lib' ? 'registry:lib' : 'registry:component',
      };
    });

  return {
    sourceFiles,
    manifest: {
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      files,
      ...optionalList('dependencies', dependencies),
      registryDependencies: [...registryDependencies].sort(),
      ...mergedMeta(options.meta, item.meta),
    },
  };
}

function createLayout<Item extends ComponentMeta>(
  root: RegistrySourceModule<Item>,
  modules: readonly RegistrySourceModule<Item>[],
  item: ShadcnItem<Item>,
  options: ShadcnPluginOptions<Item>
): ReadonlyMap<string, OwnedModule<Item>> {
  const layout = new Map<string, OwnedModule<Item>>();
  const outputPaths = new Map<string, string>();
  const targets = new Map<string, string>();
  const sourceRoot = normalizePath(options.paths.source);
  const rootFilename = normalizePath(item.filename ?? basename(root.sourcePath));

  for (const module of modules) {
    const relativeToEntry = toPosixPath(relative(dirname(root.filename), module.filename));
    const itemPath =
      module.id === root.id
        ? rootFilename
        : escapesRoot(relativeToEntry)
          ? posix.join('internal', module.sourcePath)
          : relativeToEntry;
    const outputPath =
      item.type === 'registry:block'
        ? posix.join(sourceRoot, item.name, itemPath)
        : item.type === 'registry:lib'
          ? posix.join(sourceRoot, itemPath)
          : posix.join(sourceRoot, 'components', item.name, itemPath);
    const relativeOutput = stripRoot(outputPath, sourceRoot);
    const target =
      item.type === 'registry:block'
        ? posix.join(normalizePath(options.paths.install), relativeOutput)
        : item.type === 'registry:lib'
          ? posix.join(normalizePath(options.paths.install), relativeOutput)
          : relativeOutput.startsWith('components/')
            ? posix.join(normalizePath(options.paths.install), relativeOutput.replace(/^components\//, ''))
            : posix.join(normalizePath(options.paths.install), relativeOutput);

    assertNoCollision(outputPaths, outputPath, module.id, 'output');
    assertNoCollision(targets, target, module.id, 'installation target');
    layout.set(module.id, { ...module, outputPath, target });
  }

  return layout;
}

function rewriteImports<Item extends ComponentMeta>(
  module: OwnedModule<Item>,
  layout: ReadonlyMap<string, OwnedModule<Item>>,
  modules: ReadonlyMap<string, RegistrySourceModule<Item>>,
  published: ReadonlyMap<string, PublishedModule<Item>>,
  options: ShadcnPluginOptions<Item>
): { source: string; dependencies: string[] } {
  const replacements: ImportReplacement[] = [];
  const dependencies = new Set<string>();

  for (const reference of module.imports) {
    const dependency = reference.resolvedId ? modules.get(reference.resolvedId) : undefined;
    let replacement = options.imports?.[reference.specifier];

    if (!replacement && dependency) {
      const ownedDependency = layout.get(dependency.id);
      const publishedDependency = published.get(dependency.id);

      if (ownedDependency) replacement = relativeImport(module.target, ownedDependency.target);
      else if (publishedDependency) replacement = publishedImport(publishedDependency, options);
    }

    replacement ??= reference.specifier;

    if (replacement !== reference.specifier) replacements.push({ ...reference, replacement });

    if (!dependency && !options.imports?.[reference.specifier]) {
      const graphId = reference.resolvedId ?? reference.specifier;
      const packageName = packageDependency(graphId) ?? packageDependency(reference.specifier);

      if (packageName) dependencies.add(packageName);
    }
  }

  return { source: replaceImportSpecifiers(module.source, replacements), dependencies: [...dependencies].sort() };
}

function publishedImport<Item extends ComponentMeta>(
  publication: PublishedModule<Item>,
  options: ShadcnPluginOptions<Item>
): string {
  const filename = publication.item.filename ?? basename(publication.module.sourcePath);

  return publication.item.type === 'registry:lib'
    ? posix.join(options.paths.import, stripScriptExtension(filename))
    : posix.join(options.paths.import, publication.item.name, stripScriptExtension(filename));
}

function relativeImport(importerTarget: string, dependencyTarget: string): string {
  const specifier = posix.relative(posix.dirname(importerTarget), stripScriptExtension(dependencyTarget));

  return specifier.startsWith('.') ? specifier : `./${specifier}`;
}

function stripScriptExtension(path: string): string {
  return path.replace(/\.(?:[cm]?[jt]sx?)$/, '');
}

async function loadStyle<Item extends ComponentMeta>(
  root: string,
  style: ShadcnStyle,
  options: ShadcnPluginOptions<Item>
): Promise<LoadedStyle> {
  const input = await realpath(resolve(root, style.input)).catch(() => resolve(root, style.input));

  assertInsideRoot(root, input, style.input);
  const sourceRoot = normalizePath(options.paths.source);
  const outputRoot = normalizePath(options.paths.output);
  const installRoot = normalizePath(options.paths.install);
  const styleRoot = dirname(input);
  const visited = new Map<string, string>();

  const visit = async (filename: string): Promise<void> => {
    if (visited.has(filename)) return;

    const source = await readFile(filename, 'utf8');

    visited.set(filename, source);

    for (const specifier of cssImports(source)) {
      if (!specifier.startsWith('.')) continue;

      const dependency = await realpath(resolve(dirname(filename), specifier)).catch(() =>
        resolve(dirname(filename), specifier)
      );

      assertInsideRoot(root, dependency, specifier);
      await visit(dependency);
    }
  };

  await visit(input);

  const entryName = normalizePath(style.filename ?? basename(input));

  validateRelativePath(entryName, 'Shadcn style filename');
  const files = [...visited]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([filename, content]) => {
      const relativePath = filename === input ? entryName : toPosixPath(relative(styleRoot, filename));

      if (escapesRoot(relativePath)) {
        throw new Error(`Shadcn style dependency must be inside the style entry directory: \`${filename}\`.`);
      }

      const path = posix.join(outputRoot, sourceRoot, 'styles', relativePath);
      const target = posix.join(installRoot, 'styles', relativePath);

      return { file: { path, target, type: 'registry:style' as const }, content };
    });
  const name = style.name ?? 'styles';

  return {
    files,
    manifest: {
      name,
      type: 'registry:style',
      title: style.title ?? 'Styles',
      description: style.description ?? 'Shared styles.',
      files: files.map(({ file }) => file),
      ...mergedMeta(options.meta, style.meta),
    },
  };
}

function cssImports(source: string): string[] {
  return [...source.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']/g)].map((match) => match[1]!);
}

function validateOptions<Item extends ComponentMeta>(options: ShadcnPluginOptions<Item>): void {
  for (const [name, value] of Object.entries(options.paths)) {
    if (name === 'import') continue;

    validateRelativePath(value, `Shadcn registry ${name} path`);
  }

  if (!options.paths.import || options.paths.import.startsWith('.')) {
    throw new Error(`Shadcn registry import path must be an absolute module specifier.`);
  }
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

function moduleJsxImportSource(source: string): string | undefined {
  const match = source.match(/@jsxImportSource\s+([^\s*]+)/);

  return match ? packageDependency(match[1]!) : undefined;
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

function assertInsideRoot(root: string, filename: string, source: string): void {
  if (!isInsideRoot(root, filename)) throw new Error(`Shadcn source must be inside the graph root: \`${source}\`.`);
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
  return path ? posix.normalize(toPosixPath(path)).replace(/^\.\//, '') : '';
}
