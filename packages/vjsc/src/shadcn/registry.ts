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
import type { ShadcnAuthoredItem, ShadcnItem, ShadcnPluginOptions, ShadcnRegistryFile, ShadcnStyle } from './types';

interface OwnedModule<Item extends ComponentMeta = ComponentMeta> extends RegistrySourceModule<Item> {
  readonly outputPath: string;
  readonly target: string;
}

interface BuiltItem {
  readonly group: string;
  readonly manifest: RegistryItem;
  readonly sourceFiles: ReadonlyMap<string, string>;
}

const VIRTUAL_CSS_IMPORT = /^\s*import\s+["']virtual:vjsc\/css\/[^"']+["'];?\s*$/gm;
const LOCAL_CSS_IMPORT = /@import\s+["'](\.[^"']+)["']\s*;/g;

interface LoadedStyle {
  readonly group: string;
  readonly manifest: RegistryItem;
  readonly files: readonly { readonly file: ShadcnRegistryFile; readonly content: string }[];
}

export interface ShadcnOutputFile {
  readonly path: string;
  readonly content: string;
}

/** Prepare an included Shadcn source registry from the host's transformed module graph. */
export async function createShadcnRegistryFiles<Item extends ComponentMeta>(
  graph: SourceGraph<Item>,
  options: ShadcnPluginOptions<Item>
): Promise<ShadcnOutputFile[]> {
  const modules = validateSourceGraph(graph);

  validateOptions(options);
  const published = describePublishedModules(modules, options);
  const publications = canonicalPublishedModules(modules, published);
  const style = options.styles ? await loadStyle(graph.root, options.styles, options) : undefined;
  const builtItems = await Promise.all(
    [...published.values()]
      .sort((left, right) => left.item.name.localeCompare(right.item.name))
      .map((publication) => buildPublishedItem(publication, modules, publications, style, graph, options))
  );
  const authoredItems = (options.items ?? []).map((item) => buildAuthoredItem(item, options));
  const groups = new Map<string, RegistryItem[]>();

  if (style) addGroupItem(groups, style.group, style.manifest);

  for (const item of builtItems) addGroupItem(groups, item.group, item.manifest);

  for (const item of authoredItems) addGroupItem(groups, item.group, item.manifest);

  const registry = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: options.name,
    homepage: options.homepage,
    include: [...groups.keys()].sort().map((group) => `./${normalizeGroup(group)}/registry.json`),
    items: [],
  } satisfies ShadcnRegistry;

  validateRegistryNames(groups);

  for (const groupItems of groups.values()) validateRegistryFiles(groupItems);

  registrySchema.parse(registry);

  const assets: ShadcnOutputFile[] = [jsonFile('registry.json', registry)];

  for (const [group, groupItems] of [...groups].sort(([left], [right]) => left.localeCompare(right))) {
    for (const item of groupItems) registryItemSchema.parse(item);

    assets.push(jsonFile(`${normalizeGroup(group)}/registry.json`, { items: groupItems }));
  }

  for (const item of builtItems) {
    for (const [path, content] of item.sourceFiles) {
      assets.push({ path: posix.join(normalizeGroup(item.group), path), content });
    }
  }

  for (const item of authoredItems) {
    for (const [path, content] of item.sourceFiles) {
      assets.push({ path: posix.join(normalizeGroup(item.group), path), content });
    }
  }

  if (style) {
    for (const { file, content } of style.files) {
      assets.push({ path: posix.join(normalizeGroup(style.group), file.path), content });
    }
  }

  return assets;
}

function buildAuthoredItem<Item extends ComponentMeta>(
  item: ShadcnAuthoredItem,
  options: ShadcnPluginOptions<Item>
): BuiltItem {
  validateItemName(item.name);
  const sourceFiles = new Map<string, string>();
  const targets = new Map<string, string>();
  const files = item.files.map((file, index): ShadcnRegistryFile => {
    validateRelativePath(file.target, `Shadcn item ${item.name} target`);
    const target = posix.join(normalizePath(options.paths.install), normalizePath(file.target));
    const previous = targets.get(target);
    if (previous) throw new Error(`Shadcn item \`${item.name}\` installs both \`${previous}\` and \`${target}\`.`);

    const path = posix.join('files', item.name, `${String(index).padStart(2, '0')}-${basename(target)}`);

    targets.set(target, path);
    addUnique(sourceFiles, path, file.content, 'source');

    return { path, target, type: file.type };
  });

  return {
    group: normalizeGroup(item.group),
    sourceFiles,
    manifest: {
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      files,
      ...optionalList('dependencies', versionDependencies(new Set(item.dependencies), options)),
      registryDependencies: [...new Set(item.registryDependencies)].sort(),
      ...(item.meta ? { meta: item.meta } : {}),
    },
  };
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

    const equivalent =
      item.type === 'registry:component'
        ? [...published.values()].find(
            (candidate) =>
              candidate.item.type === 'registry:component' &&
              candidate.module.filename === module.filename &&
              candidate.module.source === module.source
          )
        : undefined;
    if (equivalent) continue;

    const previous = names.get(item.name);

    if (previous) {
      throw new Error(`Shadcn item \`${item.name}\` is described by both \`${previous}\` and \`${module.id}\`.`);
    }

    names.set(item.name, module.id);
    published.set(module.id, { module, item });
  }

  return published;
}

function canonicalPublishedModules<Item extends ComponentMeta>(
  modules: ReadonlyMap<string, RegistrySourceModule<Item>>,
  published: ReadonlyMap<string, PublishedModule<Item>>
): ReadonlyMap<string, PublishedModule<Item>> {
  const canonical = new Map(published);
  const bySource = new Map<string, PublishedModule<Item>>();

  for (const publication of published.values()) {
    bySource.set(moduleSourceKey(publication.module), publication);
  }

  for (const module of modules.values()) {
    const publication = bySource.get(moduleSourceKey(module));

    if (publication) canonical.set(module.id, publication);
  }

  return canonical;
}

function moduleSourceKey(module: RegistrySourceModule): string {
  return `${module.filename}\0${module.source}`;
}

async function buildPublishedItem<Item extends ComponentMeta>(
  publication: PublishedModule<Item>,
  modules: ReadonlyMap<string, RegistrySourceModule<Item>>,
  published: ReadonlyMap<string, PublishedModule<Item>>,
  style: LoadedStyle | undefined,
  graph: SourceGraph<Item>,
  options: ShadcnPluginOptions<Item>
): Promise<BuiltItem> {
  const { item, module: root } = publication;
  const owned = collectOwnedModules(root, modules, published);
  const layout = createLayout(root, owned.modules, item, options);
  const registryDependencies = new Set<string>(
    [
      ...(item.registryDependencies ?? []),
      [...owned.publishedDependencies].map((dependency) => `${options.namespace}/${dependency}`),
    ].flat()
  );

  if (style && item.type !== 'registry:lib' && item.styles !== false) {
    registryDependencies.add(`${options.namespace}/${style.manifest.name}`);
  }

  const dependencies = new Set<string>(item.dependencies);
  const jsxImportSource = moduleJsxImportSource(root.source);

  if (jsxImportSource) dependencies.add(jsxImportSource);

  const sourceFiles = new Map<string, string>();
  const files = [...layout.values()]
    .sort((left, right) => left.outputPath.localeCompare(right.outputPath))
    .map((module): ShadcnRegistryFile => {
      const rewritten = rewriteImports(module, layout, modules, published, options);

      for (const dependency of rewritten.dependencies) dependencies.add(dependency);

      const path = posix.join('files', item.name, module.outputPath);
      let source = item.stylesheet ? stripVirtualCssImports(rewritten.source) : rewritten.source;

      if (module.id === root.id && item.stylesheet?.import) {
        const stylesheetTarget = posix.join(
          normalizePath(options.paths.install),
          normalizePath(item.stylesheet.target)
        );

        source = addStyleImport(source, relativeImport(module.target, stylesheetTarget));
      }

      addUnique(sourceFiles, path, source, 'source');
      return {
        path,
        target: module.target,
        type: item.type === 'registry:lib' ? 'registry:lib' : 'registry:component',
      };
    });

  if (item.stylesheet) {
    const css = await itemStyles(root, owned.modules, graph, item.stylesheet.files ?? []);
    const filename = basename(item.stylesheet.target);
    const path = posix.join('files', item.name, filename);
    const target = posix.join(normalizePath(options.paths.install), normalizePath(item.stylesheet.target));

    addUnique(sourceFiles, path, css, 'source');
    files.push({ path, target, type: 'registry:style' });
  }

  return {
    group: normalizeGroup(item.group),
    sourceFiles,
    manifest: {
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      files,
      ...optionalList('dependencies', versionDependencies(dependencies, options)),
      registryDependencies: [...registryDependencies].sort(),
      ...mergedMeta(options.meta, item.meta),
    },
  };
}

function versionDependencies<Item extends ComponentMeta>(
  dependencies: ReadonlySet<string>,
  options: ShadcnPluginOptions<Item>
): Set<string> {
  return new Set([...dependencies].map((dependency) => options.packages?.[dependency] ?? dependency));
}

async function itemStyles<Item extends ComponentMeta>(
  root: RegistrySourceModule<Item>,
  modules: readonly RegistrySourceModule<Item>[],
  graph: SourceGraph<Item>,
  supplemental: readonly string[]
): Promise<string> {
  const styles = new Map<string, string>();

  for (const path of supplemental) {
    validateRelativePath(path, `Shadcn item ${root.id} stylesheet file`);
    const filename = resolve(graph.root, path);

    assertInsideRoot(graph.root, filename, path);
    addUnique(styles, path, await inlineLocalCssImports(filename, graph.root, new Set()), 'stylesheet');
  }

  for (const module of modules) {
    for (const id of graph.styles?.get(module.id) ?? []) {
      if (id.endsWith('/base.css')) continue;

      const source = graph.assets?.get(id);
      if (source === undefined) throw new Error(`Shadcn item \`${root.id}\` has no captured stylesheet: \`${id}\`.`);

      addUnique(styles, id, source, 'stylesheet');
    }
  }

  return `${[...styles]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, source]) => source.trim())
    .filter(Boolean)
    .join('\n\n')}\n`;
}

async function inlineLocalCssImports(filename: string, root: string, stack: Set<string>): Promise<string> {
  if (stack.has(filename)) throw new Error(`Circular Shadcn stylesheet import: \`${filename}\`.`);

  const source = await readFile(filename, 'utf8');
  const imports = [...source.matchAll(LOCAL_CSS_IMPORT)];
  if (imports.length === 0) return source;

  stack.add(filename);
  let output = source;

  for (const match of imports.reverse()) {
    const specifier = match[1];
    const start = match.index;
    if (!specifier || start === undefined) continue;

    const imported = resolve(dirname(filename), specifier);

    assertInsideRoot(root, imported, specifier);
    const content = await inlineLocalCssImports(imported, root, stack);

    output = output.slice(0, start) + content.trim() + output.slice(start + match[0].length);
  }

  stack.delete(filename);
  return output;
}

function stripVirtualCssImports(source: string): string {
  return source.replace(VIRTUAL_CSS_IMPORT, '').replace(/\n{3,}/g, '\n\n');
}

function addStyleImport(source: string, specifier: string): string {
  const pragma = /^(\/\*\* @jsxImportSource [^*]+\*\/\s*)/;
  const statement = `import '${specifier}';\n`;

  return pragma.test(source) ? source.replace(pragma, `$1\n${statement}`) : `${statement}\n${source}`;
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
  const rootFilename = normalizePath(item.filename ?? basename(root.sourcePath));
  const rootTarget = posix.join(normalizePath(options.paths.install), normalizePath(item.target));

  for (const module of modules) {
    const relativeToEntry = toPosixPath(relative(dirname(root.filename), module.filename));
    const itemPath =
      module.id === root.id ? rootFilename : escapesRoot(relativeToEntry) ? module.sourcePath : relativeToEntry;
    const outputPath = module.id === root.id ? rootFilename : posix.join('internal', itemPath);
    const target =
      module.id === root.id ? rootTarget : posix.join(posix.dirname(rootTarget), 'internal', item.name, itemPath);

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

    if (!dependency && !options.imports?.[reference.specifier] && !reference.specifier.startsWith('virtual:')) {
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
  return posix.join(options.paths.import, stripScriptExtension(publication.item.target));
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

      const path = posix.join('files', nameForStyle(style), relativePath);
      const target =
        filename === input
          ? posix.join(installRoot, normalizePath(style.target))
          : posix.join(installRoot, posix.dirname(normalizePath(style.target)), relativePath);

      return { file: { path, target, type: 'registry:style' as const }, content };
    });
  const name = style.name ?? 'styles';

  return {
    group: normalizeGroup(style.group),
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

function addGroupItem(groups: Map<string, RegistryItem[]>, group: string, item: RegistryItem): void {
  const normalized = normalizeGroup(group);
  const items = groups.get(normalized) ?? [];

  items.push(item);
  groups.set(normalized, items);
}

function normalizeGroup(group: string): string {
  validateRelativePath(group, 'Shadcn registry group');
  return normalizePath(group);
}

function jsonFile(path: string, value: unknown): ShadcnOutputFile {
  return { path, content: `${JSON.stringify(value, null, 2)}\n` };
}

function nameForStyle(style: ShadcnStyle): string {
  return style.name ?? 'styles';
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

function validateRegistryNames(groups: ReadonlyMap<string, readonly RegistryItem[]>): void {
  const names = new Map<string, string>();

  for (const [group, items] of groups) {
    for (const item of items) assertNoCollision(names, item.name, group, 'item name');
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

function normalizePath(path: string): string {
  return path ? posix.normalize(toPosixPath(path)).replace(/^\.\//, '') : '';
}
