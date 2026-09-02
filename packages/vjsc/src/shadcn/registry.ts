import { basename, dirname, isAbsolute, posix, relative } from 'node:path';

import { type Registry, type RegistryItem, registryItemSchema, registrySchema } from 'shadcn/schema';

import type { ModuleMeta } from '../components/meta';
import {
  bundleStyles,
  collectModules,
  type GraphModule,
  type Graph,
  relativeImport,
  stripStyleImports,
} from '../graph';
import { setUnique } from '../utils/map';
import { escapesRoot, stripScriptExtension, toPosixPath } from '../utils/path';
import { type ImportReplacement, replaceImportSpecifiers } from './analyze';
import { readTailwindRegistryTheme } from './tailwind';
import type {
  RegistryModuleTarget,
  RegistryStylesheetOutput,
  RegistryStylesOptions,
  VjscRegistryOptions,
} from './types';

type RegistryFile = NonNullable<RegistryItem['files']>[number];

interface SourceBuild<Meta extends ModuleMeta> {
  readonly kind: 'source';
  readonly module: GraphModule<Meta>;
  readonly group: string;
  readonly target: RegistryModuleTarget<Meta>;
  readonly filename?: string | undefined;
  readonly imports?: Readonly<Record<string, string>> | undefined;
  readonly stylesheet?: RegistryStylesheetOutput | undefined;
  readonly theme: boolean;
}

interface StyleBuild<Meta extends ModuleMeta> {
  readonly kind: 'style';
  readonly group: string;
  readonly modules: readonly GraphModule<Meta>[];
  readonly target: string;
  readonly include?: readonly string[] | undefined;
  readonly asset?: string | undefined;
}

interface CreatedBuild {
  readonly kind: 'created';
  readonly group: string;
}

type SourceItem<Meta extends ModuleMeta> = RegistryItem & { readonly build: SourceBuild<Meta> };
type StyleItem<Meta extends ModuleMeta> = RegistryItem & { readonly build: StyleBuild<Meta> };
type CreatedItem = RegistryItem & { readonly build: CreatedBuild };

interface OwnedModule<Meta extends ModuleMeta> extends GraphModule<Meta> {
  readonly outputPath: string;
  readonly target: string;
}

interface BuiltItem {
  readonly group: string;
  readonly manifest: RegistryItem;
  readonly sourceFiles: ReadonlyMap<string, string>;
}

interface PublishedModule<Meta extends ModuleMeta> {
  readonly module: GraphModule<Meta>;
  readonly item: SourceItem<Meta>;
}

export interface ShadcnOutputFile {
  readonly path: string;
  readonly content: string;
  readonly editable: boolean;
}

/** Prepare an included Shadcn source registry from a finalized transformed-module graph. */
export async function createShadcnRegistryFiles<Meta extends ModuleMeta>(
  graph: Graph<Meta>,
  options: VjscRegistryOptions<Meta>
): Promise<ShadcnOutputFile[]> {
  validateOptions(options);

  const sourceItems = await resolveSourceItems(graph, options);
  const createdItems = await createFileItems(graph, options);

  validateItems([...sourceItems, ...createdItems]);

  const published = describePublishedModules(graph.modules, sourceItems);
  const publications = canonicalPublishedModules(graph, published);
  const styleItems = await describeStyleItems(graph, sourceItems, options);
  const builtItems = await Promise.all([
    ...[...published.values()].map((publication) =>
      buildPublishedItem(publication, graph.modules, publications, graph, options)
    ),
    ...styleItems.map((item) => buildStyleItem(item, graph, options)),
    ...createdItems.map((item) => buildCreatedItem(item, options)),
  ]);
  const groups = new Map<string, RegistryItem[]>();

  for (const item of builtItems.sort((left, right) => left.manifest.name.localeCompare(right.manifest.name))) {
    addGroupItem(groups, item.group, item.manifest);
  }

  validateRegistryNames(groups);

  for (const groupItems of groups.values()) validateRegistryFiles(groupItems);

  const registry = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: options.name,
    homepage: options.homepage,
    include: [...groups.keys()].sort().map((group) => `./${normalizeGroup(group)}/registry.json`),
    items: [],
  } satisfies Registry;

  registrySchema.parse(registry);

  const assets: ShadcnOutputFile[] = [jsonFile('registry.json', registry)];

  for (const [group, groupItems] of [...groups].sort(([left], [right]) => left.localeCompare(right))) {
    for (const item of groupItems) registryItemSchema.parse(item);

    assets.push(jsonFile(`${normalizeGroup(group)}/registry.json`, { items: groupItems }));
  }

  for (const item of builtItems) {
    for (const [path, content] of item.sourceFiles) {
      assets.push({ path: posix.join(normalizeGroup(item.group), path), content, editable: true });
    }
  }

  return assets;
}

async function resolveSourceItems<Meta extends ModuleMeta>(
  graph: Graph<Meta>,
  options: VjscRegistryOptions<Meta>
): Promise<SourceItem<Meta>[]> {
  const items: SourceItem<Meta>[] = [];

  for (const module of graph.modules.values()) {
    const resolved = await options.items.resolve({ graph, module });
    if (!resolved) continue;

    const { group, target, filename, imports, stylesheet, theme, ...item } = resolved;
    const build: SourceBuild<Meta> = {
      kind: 'source',
      module,
      group,
      target,
      ...(filename ? { filename } : {}),
      ...(imports ? { imports } : {}),
      ...(stylesheet ? { stylesheet } : {}),
      theme: theme ?? false,
    };

    items.push({ ...item, build } as SourceItem<Meta>);
  }

  return items;
}

async function createFileItems<Meta extends ModuleMeta>(
  graph: Graph<Meta>,
  options: VjscRegistryOptions<Meta>
): Promise<CreatedItem[]> {
  const items = (await options.items.create?.({ graph })) ?? [];

  return items.map((created) => {
    const { group, ...item } = created;

    return { ...item, build: { kind: 'created', group } };
  });
}

async function describeStyleItems<Meta extends ModuleMeta>(
  graph: Graph<Meta>,
  sourceItems: readonly SourceItem<Meta>[],
  options: VjscRegistryOptions<Meta>
): Promise<StyleItem<Meta>[]> {
  const styles = options.styles;
  if (!styles) return [];

  const items: StyleItem<Meta>[] = [];
  const relevantModules = new Map<string, GraphModule<Meta>>();

  for (const item of sourceItems) {
    if (item.build.stylesheet) continue;

    for (const module of collectModules(graph, item.build.module.id)) {
      relevantModules.set(module.id, module);
    }
  }

  if (styles.theme) {
    const { target, include, tailwind, ...manifest } = styles.theme;
    const tailwindTheme = tailwind ? await readTailwindRegistryTheme(graph.root, tailwind) : undefined;
    const cssVars = tailwindTheme
      ? {
          ...manifest.cssVars,
          theme: { ...tailwindTheme.cssVars, ...manifest.cssVars?.theme },
        }
      : manifest.cssVars;
    const css = tailwindTheme ? { ...tailwindTheme.css, ...manifest.css } : manifest.css;

    items.push({
      name: styleItemName(target),
      type: 'registry:style',
      ...manifest,
      cssVars,
      css,
      build: { kind: 'style', group: 'support', modules: [], target, include },
    });
  }

  for (const [asset, target] of styleFileEntries(relevantModules.values(), styles.files)) {
    const modules = [...relevantModules.values()].filter((module) => module.styles.files.includes(asset));
    if (modules.length === 0) continue;

    const label = basename(target, '.css');

    items.push({
      name: styleAssetItemName(asset),
      type: 'registry:style',
      title: `${options.name} ${label} styles`,
      description: `Shared ${label} styles installed with the source modules that use them.`,
      docs: 'Installed automatically with source modules that use these styles.',
      meta: options.styles?.theme?.meta,
      build: { kind: 'style', group: 'support', modules, target, asset },
    });
  }

  return items;
}

function describePublishedModules<Meta extends ModuleMeta>(
  modules: ReadonlyMap<string, GraphModule<Meta>>,
  items: readonly SourceItem<Meta>[]
): ReadonlyMap<string, PublishedModule<Meta>> {
  const published = new Map<string, PublishedModule<Meta>>();

  for (const item of items) {
    const module = modules.get(item.build.module.id);

    if (!module)
      throw new Error(`Shadcn item \`${item.name}\` references an unknown module: \`${item.build.module.id}\`.`);

    if (item.build.filename) validateRelativePath(item.build.filename, `Shadcn item ${item.name} filename`);

    published.set(module.id, { module, item });
  }

  return published;
}

function canonicalPublishedModules<Meta extends ModuleMeta>(
  graph: Graph<Meta>,
  published: ReadonlyMap<string, PublishedModule<Meta>>
): ReadonlyMap<string, PublishedModule<Meta>> {
  const canonical = new Map(published);
  const bySource = new Map<string, PublishedModule<Meta>[]>();

  for (const publication of published.values()) {
    const key = moduleSourceKey(publication.module, graph.assets);
    const candidates = bySource.get(key) ?? [];

    candidates.push(publication);
    bySource.set(key, candidates);
  }

  for (const module of graph.modules.values()) {
    if (canonical.has(module.id)) continue;

    const candidates = bySource.get(moduleSourceKey(module, graph.assets));
    const publication = candidates?.length === 1 ? candidates[0] : undefined;

    if (publication) canonical.set(module.id, publication);
  }

  return canonical;
}

function moduleSourceKey(module: GraphModule, assets: ReadonlyMap<string, string>): string {
  const styles = module.styles.assets.map((id) => assets.get(id) ?? id).sort();

  return `${module.filename}\0${stripStyleImports(module.source)}\0${styles.join('\0')}`;
}

function collectOwnedModules<Meta extends ModuleMeta>(
  root: GraphModule<Meta>,
  modules: ReadonlyMap<string, GraphModule<Meta>>,
  published: ReadonlyMap<string, PublishedModule<Meta>>
): { modules: GraphModule<Meta>[]; publishedDependencies: Set<string> } {
  const owned = new Map<string, GraphModule<Meta>>();
  const publishedDependencies = new Set<string>();

  const visit = (module: GraphModule<Meta>): void => {
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

async function buildPublishedItem<Meta extends ModuleMeta>(
  publication: PublishedModule<Meta>,
  modules: ReadonlyMap<string, GraphModule<Meta>>,
  published: ReadonlyMap<string, PublishedModule<Meta>>,
  graph: Graph<Meta>,
  options: VjscRegistryOptions<Meta>
): Promise<BuiltItem> {
  const { item, module: root } = publication;
  const owned = collectOwnedModules(root, modules, published);
  const layout = createLayout(root, owned.modules, item, options);
  const styleOutputs = sourceStyleOutputs(owned.modules, item, options);
  const registryDependencies = new Set<string>([
    ...(item.registryDependencies ?? []),
    ...[...owned.publishedDependencies].map((dependency) => `${options.namespace}/${dependency}`),
    ...styleOutputs.dependencies.map((dependency) => `${options.namespace}/${dependency}`),
  ]);
  const dependencies = new Set<string>(item.dependencies ?? []);
  const jsxImportSource = moduleJsxImportSource(root.source);

  if (jsxImportSource) dependencies.add(jsxImportSource);

  const sourceFiles = new Map<string, string>();
  const files = [...layout.values()]
    .sort((left, right) => left.outputPath.localeCompare(right.outputPath))
    .map((module): RegistryFile => {
      const rewritten = rewriteModuleImports(module, layout, modules, published, item, options);

      for (const dependency of rewritten.dependencies) dependencies.add(dependency);

      const path = posix.join('files', item.name, module.outputPath);
      let source = stripStyleImports(rewritten.source);

      if (module.id === root.id) {
        for (const styleTarget of [...styleOutputs.imports].sort().reverse()) {
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

  if (item.build.stylesheet) {
    const css = await registryStyles(item.name, owned.modules, graph, item.build.stylesheet.include ?? []);
    const filename = basename(item.build.stylesheet.target);
    const path = posix.join('files', item.name, filename);
    const target = posix.join(normalizePath(options.paths.install), normalizePath(item.build.stylesheet.target));

    addUnique(sourceFiles, path, css, 'source');
    files.push({ path, target, type: 'registry:style' });
  }

  return {
    group: normalizeGroup(item.build.group),
    sourceFiles,
    manifest: buildManifest(item, options, files, dependencies, registryDependencies),
  };
}

function sourceStyleOutputs<Meta extends ModuleMeta>(
  modules: readonly GraphModule<Meta>[],
  item: SourceItem<Meta>,
  options: VjscRegistryOptions<Meta>
): { readonly dependencies: string[]; readonly imports: string[] } {
  const styles = options.styles;
  const hasStyles = modules.some((module) => module.styles.files.length > 0 || module.styles.assets.length > 0);
  if (!hasStyles && !item.build.theme) return { dependencies: [], imports: [] };

  const dependencies = new Set<string>();
  const targets = new Set<string>();

  if (styles?.theme && (hasStyles || item.build.theme)) {
    targets.add(styles.theme.target);

    if (styles.theme.target !== item.build.stylesheet?.target) dependencies.add(styleItemName(styles.theme.target));
  }

  if (item.build.stylesheet) {
    targets.add(item.build.stylesheet.target);
  } else {
    for (const module of modules) {
      for (const filename of module.styles.files) {
        const target = styleFileTarget(styles?.files, filename);
        if (!target) continue;

        targets.add(target);
        dependencies.add(styleAssetItemName(filename));
      }
    }
  }

  const imports = [...targets].sort();

  return { dependencies: [...dependencies].sort(), imports };
}

function styleFileEntries<Meta extends ModuleMeta>(
  modules: Iterable<GraphModule<Meta>>,
  files: RegistryStylesOptions['files']
): Array<readonly [string, string]> {
  if (!files) return [];

  if (typeof files !== 'string') return Object.entries(files);

  const filenames = new Set<string>();

  for (const module of modules) {
    for (const filename of module.styles.files) filenames.add(filename);
  }

  return [...filenames].sort().map((filename) => [filename, styleFileTarget(files, filename)!]);
}

function styleFileTarget(files: RegistryStylesOptions['files'], filename: string): string | undefined {
  if (!files) return undefined;

  return typeof files === 'string' ? posix.join(files, filename) : files[filename];
}

async function buildStyleItem<Meta extends ModuleMeta>(
  item: StyleItem<Meta>,
  graph: Graph<Meta>,
  options: VjscRegistryOptions<Meta>
): Promise<BuiltItem> {
  const css = await registryStyles(
    item.name,
    item.build.modules,
    graph,
    item.build.include ?? [],
    item.build.asset,
    item.build.asset !== undefined
  );
  const target = posix.join(normalizePath(options.paths.install), normalizePath(item.build.target));
  const path = posix.join('files', item.name, basename(item.build.target));
  const sourceFiles = new Map([[path, css]]);
  const files: RegistryFile[] = [{ path, target, type: 'registry:style' }];

  return {
    group: normalizeGroup(item.build.group),
    sourceFiles,
    manifest: buildManifest(item, options, files),
  };
}

function buildCreatedItem<Meta extends ModuleMeta>(item: CreatedItem, options: VjscRegistryOptions<Meta>): BuiltItem {
  const sourceFiles = new Map<string, string>();
  const files = (item.files ?? []).map((file): RegistryFile => {
    if (!file.content) throw new Error(`Shadcn file item \`${item.name}\` has no content for \`${file.path}\`.`);

    validateRelativePath(file.path, `Shadcn item ${item.name} file path`);
    const path = posix.join('files', item.name, normalizePath(file.path));

    addUnique(sourceFiles, path, file.content, 'source');
    return { ...file, path, content: undefined };
  });

  return {
    group: normalizeGroup(item.build.group),
    sourceFiles,
    manifest: buildManifest(item, options, files),
  };
}

function buildManifest<Meta extends ModuleMeta>(
  item: SourceItem<Meta> | StyleItem<Meta> | CreatedItem,
  options: VjscRegistryOptions<Meta>,
  files: readonly RegistryFile[],
  dependencies: ReadonlySet<string> = new Set(item.dependencies ?? []),
  registryDependencies: ReadonlySet<string> = new Set(item.registryDependencies ?? [])
): RegistryItem {
  return {
    ...publicRegistryItem(item),
    ...(files.length ? { files: [...files] } : {}),
    ...optionalList('dependencies', versionDependencies(dependencies, options)),
    ...optionalList('registryDependencies', registryDependencies),
    ...mergedMeta(options.meta, item.meta),
  };
}

function publicRegistryItem<Meta extends ModuleMeta>(
  item: SourceItem<Meta> | StyleItem<Meta> | CreatedItem
): RegistryItem {
  const { build: _build, ...manifest } = item;

  return manifest;
}

function versionDependencies<Meta extends ModuleMeta>(
  dependencies: ReadonlySet<string>,
  options: VjscRegistryOptions<Meta>
): Set<string> {
  return new Set([...dependencies].map((dependency) => options.packages?.[dependency] ?? dependency));
}

async function registryStyles<Meta extends ModuleMeta>(
  label: string,
  modules: readonly GraphModule<Meta>[],
  graph: Graph<Meta>,
  supplemental: readonly string[],
  asset?: string,
  includeAssets = true
): Promise<string> {
  for (const path of supplemental) validateRelativePath(path, `Shadcn item ${label} stylesheet file`);

  return bundleStyles(graph, modules, {
    label,
    files: supplemental,
    asset,
    includeAssets,
  });
}

function addStyleImport(source: string, specifier: string): string {
  const pragma = /^(\/\*\* @jsxImportSource [^*]+\*\/\s*)/;
  const statement = `import '${specifier}';\n`;

  return pragma.test(source) ? source.replace(pragma, `$1\n${statement}`) : `${statement}\n${source}`;
}

function createLayout<Meta extends ModuleMeta>(
  root: GraphModule<Meta>,
  modules: readonly GraphModule<Meta>[],
  item: SourceItem<Meta>,
  options: VjscRegistryOptions<Meta>
): ReadonlyMap<string, OwnedModule<Meta>> {
  const layout = new Map<string, OwnedModule<Meta>>();
  const outputPaths = new Map<string, string>();
  const targets = new Map<string, string>();
  const rootFilename = normalizePath(item.build.filename ?? basename(root.sourcePath));
  const installRoot = normalizePath(options.paths.install);
  const rootTarget = installedTarget(item, root, root, options);

  for (const module of modules) {
    const relativeToEntry = toPosixPath(relative(dirname(root.filename), module.filename));

    if (typeof item.build.target !== 'function' && module.id !== root.id && escapesRoot(relativeToEntry)) {
      throw new Error(
        `Shadcn item \`${item.name}\` reaches unowned module \`${module.sourcePath}\`. ` +
          `Reason: registry output cannot hide shared modules under compiler-shaped internal paths. ` +
          `Recommendation: publish reusable source as a private registry dependency or move source-owned dependencies beside their root.`
      );
    }

    const configuredTarget = installedTarget(item, module, root, options);
    const target =
      typeof item.build.target === 'function'
        ? configuredTarget
        : module.id === root.id
          ? rootTarget
          : posix.join(posix.dirname(rootTarget), relativeToEntry);
    const outputPath =
      typeof item.build.target === 'function'
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

function rewriteModuleImports<Meta extends ModuleMeta>(
  module: OwnedModule<Meta>,
  layout: ReadonlyMap<string, OwnedModule<Meta>>,
  modules: ReadonlyMap<string, GraphModule<Meta>>,
  published: ReadonlyMap<string, PublishedModule<Meta>>,
  item: SourceItem<Meta>,
  options: VjscRegistryOptions<Meta>
): { source: string; dependencies: string[] } {
  const replacements: ImportReplacement[] = [];
  const dependencies = new Set<string>();

  for (const reference of module.imports) {
    const dependency = reference.resolvedId ? modules.get(reference.resolvedId) : undefined;
    let replacement = item.build.imports?.[reference.specifier] ?? options.imports?.[reference.specifier];

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
      !item.build.imports?.[reference.specifier] &&
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

function publishedImport<Meta extends ModuleMeta>(
  publication: PublishedModule<Meta>,
  options: VjscRegistryOptions<Meta>
): string {
  const target = targetForModule(publication.item, publication.module, publication.module);

  return posix.join(options.paths.import, stripScriptExtension(target));
}

function installedTarget<Meta extends ModuleMeta>(
  item: SourceItem<Meta>,
  module: GraphModule<Meta>,
  root: GraphModule<Meta>,
  options: VjscRegistryOptions<Meta>
): string {
  return posix.join(normalizePath(options.paths.install), normalizePath(targetForModule(item, module, root)));
}

function targetForModule<Meta extends ModuleMeta>(
  item: SourceItem<Meta>,
  module: GraphModule<Meta>,
  root: GraphModule<Meta>
): string {
  const target = typeof item.build.target === 'function' ? item.build.target(module, root) : item.build.target;

  validateRelativePath(target, `Shadcn item ${item.name} target`);
  return target;
}

function styleItemName(target: string): string {
  validateRelativePath(target, 'Shadcn registry style target');

  return `_style-${basename(target, '.css')}`;
}

function styleAssetItemName(asset: string): string {
  validateRelativePath(asset, 'VJSC style asset');

  return `_style-${asset.slice(0, -'.css'.length).replaceAll('/', '-')}`;
}

function validateOptions<Meta extends ModuleMeta>(options: VjscRegistryOptions<Meta>): void {
  for (const [name, value] of Object.entries(options.paths)) {
    if (name === 'import') continue;

    validateRelativePath(value, `Shadcn registry ${name} path`);
  }

  if (!options.paths.import || options.paths.import.startsWith('.')) {
    throw new Error(`Shadcn registry import path must be an absolute module specifier.`);
  }

  if (options.styles?.theme?.tailwind) {
    validateRelativePath(options.styles.theme.tailwind, 'Shadcn registry Tailwind source');
  }
}

function validateItems<Meta extends ModuleMeta>(items: readonly (SourceItem<Meta> | CreatedItem)[]): void {
  const names = new Map<string, string>();
  const modules = new Map<string, string>();

  for (const item of items) {
    validateItemName(item.name);

    const owner = item.build.kind === 'source' ? item.build.module.id : item.build.kind;

    assertNoCollision(names, item.name, owner, 'item name');

    if (item.build.kind === 'source') {
      assertNoCollision(modules, item.build.module.id, item.name, 'module publication');
    }
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
  return { path, content: `${JSON.stringify(value, null, 2)}\n`, editable: false };
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

  if (id.startsWith('@')) {
    return segments.length >= 2 && segments[0]!.length > 1 ? `${segments[0]}/${segments[1]}` : undefined;
  }

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

function normalizePath(path: string): string {
  return path ? posix.normalize(toPosixPath(path)).replace(/^\.\//, '') : '';
}

function assertNoCollision(paths: Map<string, string>, path: string, id: string, kind: string): void {
  setUnique(
    paths,
    path,
    id,
    (previous) => `Shadcn registry ${kind} collision: \`${previous}\` and \`${id}\` both map to \`${path}\`.`
  );
}

function addUnique(files: Map<string, string>, path: string, content: string, kind: string): void {
  setUnique(files, path, content, () => `Shadcn registry ${kind} collision: \`${path}\`.`);
}
