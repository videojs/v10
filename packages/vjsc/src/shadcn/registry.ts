import { basename, dirname, isAbsolute, posix, relative } from 'node:path';

import { type RegistryItem, registryItemSchema, registrySchema, type Registry as ShadcnRegistry } from 'shadcn/schema';

import type { ComponentMeta } from '../components/meta';
import {
  type ComponentGraph,
  type ComponentGraphModule,
  createComponentGraphStyles,
  type ValidatedComponentGraphModule,
  validateComponentGraph,
} from '../graph';
import { escapesRoot, toPosixPath } from '../utils/path';
import { type ImportReplacement, replaceImportSpecifiers } from './analyze';
import type {
  ShadcnRegistryFile,
  ShadcnRegistryPluginOptions,
  VjscRegistryItem,
  VjscRegistryFilesItemMeta,
  VjscRegistryManifestItemMeta,
  VjscRegistrySourceItemMeta,
  VjscRegistryStyleItemMeta,
} from './types';

interface OwnedModule<Item extends ComponentMeta = ComponentMeta> extends ValidatedComponentGraphModule<Item> {
  readonly outputPath: string;
  readonly target: string;
}

interface BuiltItem {
  readonly group: string;
  readonly manifest: RegistryItem;
  readonly sourceFiles: ReadonlyMap<string, string>;
}

interface PublishedModule<Item extends ComponentMeta = ComponentMeta> {
  readonly module: ValidatedComponentGraphModule<Item>;
  readonly item: SourceRegistryItem<Item>;
}

type SourceRegistryItem<Item extends ComponentMeta = ComponentMeta> = VjscRegistryItem<Item> & {
  readonly $vjsc: VjscRegistrySourceItemMeta<Item>;
};

type StyleRegistryItem<Item extends ComponentMeta = ComponentMeta> = VjscRegistryItem<Item> & {
  readonly $vjsc: VjscRegistryStyleItemMeta<Item>;
};

type ManifestRegistryItem<Item extends ComponentMeta = ComponentMeta> = VjscRegistryItem<Item> & {
  readonly $vjsc: VjscRegistryManifestItemMeta;
};

type FilesRegistryItem<Item extends ComponentMeta = ComponentMeta> = VjscRegistryItem<Item> & {
  readonly $vjsc: VjscRegistryFilesItemMeta;
};

const VIRTUAL_CSS_IMPORT = /import\s+["']virtual:vjsc\/css\/[^"']+["'];?\s*/g;

export interface ShadcnOutputFile {
  readonly path: string;
  readonly content: string;
}

/** Prepare an included Shadcn source registry from the host's transformed module graph. */
export async function createShadcnRegistryFiles<Item extends ComponentMeta>(
  graph: ComponentGraph<Item>,
  options: ShadcnRegistryPluginOptions<Item>
): Promise<ShadcnOutputFile[]> {
  const modules = validateComponentGraph(graph);

  validateOptions(options);
  const described = [...(await options.items(graph))];

  validateItems(described);

  const sourceItems = described.filter(isSourceItem);
  const published = describePublishedModules(modules, sourceItems);
  const publications = canonicalPublishedModules(modules, published);
  const builtItems = await Promise.all([
    ...[...published.values()].map((publication) =>
      buildPublishedItem(publication, modules, publications, graph, options)
    ),
    ...described.filter(isStyleItem).map((item) => buildStyleItem(item, modules, graph, options)),
    ...described.filter(isFilesItem).map((item) => buildFilesItem(item, options)),
    ...described.filter(isManifestItem).map((item) => buildManifestItem(item, options)),
  ]);
  const groups = new Map<string, RegistryItem[]>();

  for (const item of builtItems.sort((left, right) => left.manifest.name.localeCompare(right.manifest.name))) {
    addGroupItem(groups, item.group, item.manifest);
  }

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

  return assets;
}

function buildFilesItem<Item extends ComponentMeta>(
  item: FilesRegistryItem<Item>,
  options: ShadcnRegistryPluginOptions<Item>
): BuiltItem {
  const sourceFiles = new Map<string, string>();
  const files = (item.files ?? []).map((file): ShadcnRegistryFile => {
    if (!file.content) throw new Error(`Shadcn file item \`${item.name}\` has no content for \`${file.path}\`.`);

    validateRelativePath(file.path, `Shadcn item ${item.name} file path`);
    const path = posix.join('files', item.name, normalizePath(file.path));

    addUnique(sourceFiles, path, file.content, 'source');
    return { ...file, path, content: undefined };
  });

  return {
    group: normalizeGroup(item.$vjsc.group),
    sourceFiles,
    manifest: buildManifest(item, options, files),
  };
}

function describePublishedModules<Item extends ComponentMeta>(
  modules: ReadonlyMap<string, ValidatedComponentGraphModule<Item>>,
  items: readonly SourceRegistryItem<Item>[]
): ReadonlyMap<string, PublishedModule<Item>> {
  const published = new Map<string, PublishedModule<Item>>();

  for (const item of items) {
    const module = modules.get(item.$vjsc.module.id);

    if (!module) {
      throw new Error(`Shadcn item \`${item.name}\` references an unknown module: \`${item.$vjsc.module.id}\`.`);
    }

    if (item.$vjsc.filename) validateRelativePath(item.$vjsc.filename, `Shadcn item ${item.name} filename`);

    published.set(module.id, { module, item });
  }

  return published;
}

function canonicalPublishedModules<Item extends ComponentMeta>(
  modules: ReadonlyMap<string, ValidatedComponentGraphModule<Item>>,
  published: ReadonlyMap<string, PublishedModule<Item>>
): ReadonlyMap<string, PublishedModule<Item>> {
  const canonical = new Map(published);
  const bySource = new Map<string, PublishedModule<Item>[]>();

  for (const publication of published.values()) {
    const key = moduleSourceKey(publication.module);
    const candidates = bySource.get(key) ?? [];

    candidates.push(publication);
    bySource.set(key, candidates);
  }

  for (const module of modules.values()) {
    if (canonical.has(module.id)) continue;

    const candidates = bySource.get(moduleSourceKey(module));
    const publication = candidates?.length === 1 ? candidates[0] : undefined;

    if (publication) canonical.set(module.id, publication);
  }

  return canonical;
}

function moduleSourceKey(module: ValidatedComponentGraphModule): string {
  return `${module.filename}\0${stripVirtualCssImports(module.source)}`;
}

function collectOwnedModules<Item extends ComponentMeta>(
  root: ValidatedComponentGraphModule<Item>,
  modules: ReadonlyMap<string, ValidatedComponentGraphModule<Item>>,
  published: ReadonlyMap<string, PublishedModule<Item>>
): { modules: ValidatedComponentGraphModule<Item>[]; publishedDependencies: Set<string> } {
  const owned = new Map<string, ValidatedComponentGraphModule<Item>>();
  const publishedDependencies = new Set<string>();

  const visit = (module: ValidatedComponentGraphModule<Item>): void => {
    if (owned.has(module.id)) return;

    owned.set(module.id, module);

    for (const graphImport of module.imports) {
      const dependency = graphImport.resolvedId ? modules.get(graphImport.resolvedId) : undefined;
      if (!dependency) continue;

      const publication = published.get(dependency.id);

      if (dependency.id !== root.id && publication) publishedDependencies.add(publication.item.name);
      else visit(dependency);
    }
  };

  visit(root);
  return { modules: [...owned.values()], publishedDependencies };
}

async function buildPublishedItem<Item extends ComponentMeta>(
  publication: PublishedModule<Item>,
  modules: ReadonlyMap<string, ValidatedComponentGraphModule<Item>>,
  published: ReadonlyMap<string, PublishedModule<Item>>,
  graph: ComponentGraph<Item>,
  options: ShadcnRegistryPluginOptions<Item>
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

  const dependencies = new Set<string>(item.dependencies);
  const jsxImportSource = moduleJsxImportSource(root.source);

  if (jsxImportSource) dependencies.add(jsxImportSource);

  const sourceFiles = new Map<string, string>();
  const files = [...layout.values()]
    .sort((left, right) => left.outputPath.localeCompare(right.outputPath))
    .map((module): ShadcnRegistryFile => {
      const rewritten = rewriteImports(module, layout, modules, published, item, options);

      for (const dependency of rewritten.dependencies) dependencies.add(dependency);

      const path = posix.join('files', item.name, module.outputPath);
      let source = stripVirtualCssImports(rewritten.source);

      if (module.id === root.id) {
        const styleTargets = new Set(item.$vjsc.styleImports ?? []);

        if (item.$vjsc.stylesheet?.import) styleTargets.add(item.$vjsc.stylesheet.target);

        for (const styleTarget of [...styleTargets].sort().reverse()) {
          const stylesheetTarget = posix.join(normalizePath(options.paths.install), normalizePath(styleTarget));

          source = addStyleImport(source, relativeImport(module.target, stylesheetTarget));
        }
      }

      addUnique(sourceFiles, path, source, 'source');
      return {
        path,
        target: module.target,
        type: item.type === 'registry:lib' ? 'registry:lib' : 'registry:component',
      };
    });

  if (item.$vjsc.stylesheet) {
    const css = await componentGraphStyles(item.name, owned.modules, graph, item.$vjsc.stylesheet.files ?? []);
    const filename = basename(item.$vjsc.stylesheet.target);
    const path = posix.join('files', item.name, filename);
    const target = posix.join(normalizePath(options.paths.install), normalizePath(item.$vjsc.stylesheet.target));

    addUnique(sourceFiles, path, css, 'source');
    files.push({ path, target, type: 'registry:style' });
  }

  return {
    group: normalizeGroup(item.$vjsc.group),
    sourceFiles,
    manifest: buildManifest(item, options, files, dependencies, registryDependencies),
  };
}

async function buildStyleItem<Item extends ComponentMeta>(
  item: StyleRegistryItem<Item>,
  modules: ReadonlyMap<string, ValidatedComponentGraphModule<Item>>,
  graph: ComponentGraph<Item>,
  options: ShadcnRegistryPluginOptions<Item>
): Promise<BuiltItem> {
  const selected = item.$vjsc.modules.map((candidate) => {
    const module = modules.get(candidate.id);
    if (!module) throw new Error(`Shadcn item \`${item.name}\` references an unknown module: \`${candidate.id}\`.`);

    return module;
  });
  const target = posix.join(normalizePath(options.paths.install), normalizePath(item.$vjsc.target));
  const css = await componentGraphStyles(
    item.name,
    selected,
    graph,
    item.$vjsc.files ?? [],
    item.$vjsc.asset,
    item.$vjsc.asset !== undefined
  );
  const path = posix.join('files', item.name, basename(item.$vjsc.target));
  const sourceFiles = new Map([[path, css]]);
  const files: ShadcnRegistryFile[] = [{ path, target, type: 'registry:style' }];

  return {
    group: normalizeGroup(item.$vjsc.group),
    sourceFiles,
    manifest: buildManifest(item, options, files),
  };
}

function buildManifestItem<Item extends ComponentMeta>(
  item: ManifestRegistryItem<Item>,
  options: ShadcnRegistryPluginOptions<Item>
): BuiltItem {
  return {
    group: normalizeGroup(item.$vjsc.group),
    sourceFiles: new Map(),
    manifest: buildManifest(item, options, []),
  };
}

function buildManifest<Item extends ComponentMeta>(
  item: VjscRegistryItem<Item>,
  options: ShadcnRegistryPluginOptions<Item>,
  files: readonly ShadcnRegistryFile[],
  dependencies: ReadonlySet<string> = new Set(item.dependencies),
  registryDependencies: ReadonlySet<string> = new Set(item.registryDependencies)
): RegistryItem {
  return {
    ...publicRegistryItem(item),
    ...(files.length ? { files: [...files] } : {}),
    ...optionalList('dependencies', versionDependencies(dependencies, options)),
    ...optionalList('registryDependencies', registryDependencies),
    ...mergedMeta(options.meta, item.meta),
  };
}

function publicRegistryItem<Item extends ComponentMeta>(item: VjscRegistryItem<Item>): RegistryItem {
  const { $vjsc: _vjsc, ...manifest } = item;

  return manifest;
}

function versionDependencies<Item extends ComponentMeta>(
  dependencies: ReadonlySet<string>,
  options: ShadcnRegistryPluginOptions<Item>
): Set<string> {
  return new Set([...dependencies].map((dependency) => options.packages?.[dependency] ?? dependency));
}

async function componentGraphStyles<Item extends ComponentMeta>(
  label: string,
  modules: readonly ValidatedComponentGraphModule<Item>[],
  graph: ComponentGraph<Item>,
  supplemental: readonly string[],
  asset?: string,
  includeAssets = true
): Promise<string> {
  for (const path of supplemental) {
    validateRelativePath(path, `Shadcn item ${label} stylesheet file`);
  }

  return createComponentGraphStyles(graph, modules, {
    label,
    files: supplemental,
    asset,
    includeAssets,
  });
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
  root: ValidatedComponentGraphModule<Item>,
  modules: readonly ValidatedComponentGraphModule<Item>[],
  item: SourceRegistryItem<Item>,
  options: ShadcnRegistryPluginOptions<Item>
): ReadonlyMap<string, OwnedModule<Item>> {
  const layout = new Map<string, OwnedModule<Item>>();
  const outputPaths = new Map<string, string>();
  const targets = new Map<string, string>();
  const rootFilename = normalizePath(item.$vjsc.filename ?? basename(root.sourcePath));
  const installRoot = normalizePath(options.paths.install);
  const rootTarget = installedTarget(item, root, root, options);

  for (const module of modules) {
    const relativeToEntry = toPosixPath(relative(dirname(root.filename), module.filename));

    if (typeof item.$vjsc.target !== 'function' && module.id !== root.id && escapesRoot(relativeToEntry)) {
      throw new Error(
        `Shadcn item \`${item.name}\` reaches unowned module \`${module.sourcePath}\`. ` +
          `Reason: registry output cannot hide shared modules under compiler-shaped internal paths. ` +
          `Recommendation: publish reusable source as a private registry dependency or move Skin-owned source beside its Skin.`
      );
    }

    const configuredTarget = installedTarget(item, module, root, options);
    const target =
      typeof item.$vjsc.target === 'function'
        ? configuredTarget
        : module.id === root.id
          ? rootTarget
          : posix.join(posix.dirname(rootTarget), relativeToEntry);
    const outputPath =
      typeof item.$vjsc.target === 'function'
        ? posix.relative(installRoot, target)
        : module.id === root.id
          ? rootFilename
          : relativeToEntry;

    assertNoCollision(outputPaths, outputPath, module.id, 'output');
    assertNoCollision(targets, target, module.id, 'installation target');
    layout.set(module.id, { ...module, outputPath, target });
  }

  return layout;
}

function rewriteImports<Item extends ComponentMeta>(
  module: OwnedModule<Item>,
  layout: ReadonlyMap<string, OwnedModule<Item>>,
  modules: ReadonlyMap<string, ValidatedComponentGraphModule<Item>>,
  published: ReadonlyMap<string, PublishedModule<Item>>,
  item: SourceRegistryItem<Item>,
  options: ShadcnRegistryPluginOptions<Item>
): { source: string; dependencies: string[] } {
  const replacements: ImportReplacement[] = [];
  const dependencies = new Set<string>();

  for (const reference of module.imports) {
    const dependency = reference.resolvedId ? modules.get(reference.resolvedId) : undefined;
    let replacement = item.$vjsc.imports?.[reference.specifier] ?? options.imports?.[reference.specifier];

    if (!replacement && dependency) {
      const ownedDependency = layout.get(dependency.id);
      const publishedDependency = published.get(dependency.id);

      if (ownedDependency) replacement = relativeImport(module.target, ownedDependency.target);
      else if (publishedDependency) replacement = publishedImport(publishedDependency, options);
    }

    replacement ??= reference.specifier;

    if (replacement !== reference.specifier) replacements.push({ ...reference, replacement });

    if (
      !dependency &&
      !item.$vjsc.imports?.[reference.specifier] &&
      !options.imports?.[reference.specifier] &&
      !reference.specifier.startsWith('virtual:')
    ) {
      const graphId = reference.resolvedId ?? reference.specifier;
      const packageName = packageDependency(graphId) ?? packageDependency(reference.specifier);

      if (packageName) dependencies.add(packageName);
    }
  }

  return { source: replaceImportSpecifiers(module.source, replacements), dependencies: [...dependencies].sort() };
}

function publishedImport<Item extends ComponentMeta>(
  publication: PublishedModule<Item>,
  options: ShadcnRegistryPluginOptions<Item>
): string {
  const target = targetForModule(publication.item, publication.module, publication.module);

  return posix.join(options.paths.import, stripScriptExtension(target));
}

function installedTarget<Item extends ComponentMeta>(
  item: SourceRegistryItem<Item>,
  module: ComponentGraphModule<Item>,
  root: ComponentGraphModule<Item>,
  options: ShadcnRegistryPluginOptions<Item>
): string {
  return posix.join(normalizePath(options.paths.install), normalizePath(targetForModule(item, module, root)));
}

function targetForModule<Item extends ComponentMeta>(
  item: SourceRegistryItem<Item>,
  module: ComponentGraphModule<Item>,
  root: ComponentGraphModule<Item>
): string {
  const target = typeof item.$vjsc.target === 'function' ? item.$vjsc.target(module, root) : item.$vjsc.target;

  validateRelativePath(target, `Shadcn item ${item.name} target`);
  return target;
}

function relativeImport(importerTarget: string, dependencyTarget: string): string {
  const specifier = posix.relative(posix.dirname(importerTarget), stripScriptExtension(dependencyTarget));

  return specifier.startsWith('.') ? specifier : `./${specifier}`;
}

function stripScriptExtension(path: string): string {
  return path.replace(/\.(?:[cm]?[jt]sx?)$/, '');
}

function validateOptions<Item extends ComponentMeta>(options: ShadcnRegistryPluginOptions<Item>): void {
  for (const [name, value] of Object.entries(options.paths)) {
    if (name === 'import') continue;

    validateRelativePath(value, `Shadcn registry ${name} path`);
  }

  if (!options.paths.import || options.paths.import.startsWith('.')) {
    throw new Error(`Shadcn registry import path must be an absolute module specifier.`);
  }
}

function validateItems<Item extends ComponentMeta>(items: readonly VjscRegistryItem<Item>[]): void {
  const names = new Map<string, string>();
  const modules = new Map<string, string>();

  for (const item of items) {
    validateItemName(item.name);

    const owner = isSourceItem(item) ? item.$vjsc.module.id : String(item.$vjsc.kind);

    assertNoCollision(names, item.name, owner, 'item name');

    if (isSourceItem(item)) {
      assertNoCollision(modules, item.$vjsc.module.id, item.name, 'module publication');
    } else if (isStyleItem(item)) {
      validateRelativePath(item.$vjsc.target, `Shadcn item ${item.name} target`);

      if (item.$vjsc.asset) validateRelativePath(item.$vjsc.asset, `Shadcn item ${item.name} asset`);
    }
  }
}

function isSourceItem<Item extends ComponentMeta>(item: VjscRegistryItem<Item>): item is SourceRegistryItem<Item> {
  return item.$vjsc.kind === undefined || item.$vjsc.kind === 'source';
}

function isStyleItem<Item extends ComponentMeta>(item: VjscRegistryItem<Item>): item is StyleRegistryItem<Item> {
  return item.$vjsc.kind === 'style';
}

function isFilesItem<Item extends ComponentMeta>(item: VjscRegistryItem<Item>): item is FilesRegistryItem<Item> {
  return item.$vjsc.kind === 'files';
}

function isManifestItem<Item extends ComponentMeta>(item: VjscRegistryItem<Item>): item is ManifestRegistryItem<Item> {
  return item.$vjsc.kind === 'manifest';
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

function validateRegistryFiles(items: readonly RegistryItem[]): void {
  for (const item of items) {
    const paths = new Set<string>();
    const targets = new Set<string>();

    for (const file of item.files ?? []) {
      if (paths.has(file.path)) {
        throw new Error(`Shadcn registry item \`${item.name}\` contains duplicate source path \`${file.path}\`.`);
      }

      paths.add(file.path);

      if (file.target && targets.has(file.target)) {
        throw new Error(
          `Shadcn registry item \`${item.name}\` contains duplicate installation target \`${file.target}\`.`
        );
      }

      if (file.target) targets.add(file.target);
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
