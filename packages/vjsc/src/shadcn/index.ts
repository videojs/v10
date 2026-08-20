import { readFile } from 'node:fs/promises';
import { posix, resolve } from 'node:path';

import { uniqBy } from '@videojs/utils/array';
import {
  type RegistryItem,
  registryItemSchema,
  registrySchema,
  type Registry as ShadcnRegistrySchema,
} from 'shadcn/schema';
import type { ComponentMeta } from '../components/meta';
import type { SourceDefinition } from './source/define';
import { defineDiscoveredSource } from './source/define';
import {
  type SourceOutputFile,
  type SourceStyleTransform,
  type SourceTransformer,
  type TransformedSourceItem,
  transformSource,
} from './source/project';
import { resolveSource, type Source, type SourceItem } from './source/resolve';

type RegistryItemType = RegistryItem['type'];
type PublishedRegistryItemType = Extract<RegistryItemType, 'registry:block' | 'registry:component'>;
type SharedRegistryItemType = Extract<RegistryItemType, 'registry:lib' | 'registry:style'>;

export type ShadcnRegistry = ShadcnRegistrySchema;
export type ShadcnRegistryFile = NonNullable<RegistryItem['files']>[number];
export type ShadcnRegistryFileType = ShadcnRegistryFile['type'];

/** Discover the self-describing components owned by one Shadcn registry. */
export function defineShadcnSource<Item extends ComponentMeta>() {
  return defineDiscoveredSource<Item>();
}

export interface ShadcnRegistrySharedFile {
  /** Source-relative input file. */
  readonly source: string;
  /** Path relative to the registry source root. Defaults to `source`. */
  readonly path?: string | undefined;
  /** Installation path relative to the registry install root. Defaults to `path`. */
  readonly target?: string | undefined;
  readonly type?: ShadcnRegistryFileType | undefined;
}

export interface ShadcnRegistrySharedItem {
  readonly name: string;
  readonly type: SharedRegistryItemType;
  readonly title: string;
  readonly description: string;
  readonly files: readonly ShadcnRegistrySharedFile[];
  readonly dependencies?: readonly string[] | undefined;
  readonly requiredBy?:
    | 'all'
    | {
        readonly imports: readonly string[];
      }
    | undefined;
  readonly meta?: RegistryItem['meta'];
}

export interface ShadcnRegistryItemDescription {
  readonly type: PublishedRegistryItemType;
  readonly title: string;
  readonly description: string;
  readonly meta?: RegistryItem['meta'];
}

export interface ShadcnRegistryDefinition<Definition extends SourceDefinition = SourceDefinition> {
  readonly name: string;
  readonly homepage: string;
  readonly namespace: string;
  readonly paths: {
    readonly output: string;
    readonly source: string;
    readonly install: string;
    readonly import: string;
  };
  /** Source-only import rewrites applied to editable registry files. */
  readonly imports?: Readonly<Record<string, string>> | undefined;
  readonly meta?: RegistryItem['meta'];
  readonly items: {
    readonly published: readonly SourceItem<Definition>['name'][];
    readonly shared?: readonly ShadcnRegistrySharedItem[] | undefined;
    describe(item: SourceItem<Definition>): ShadcnRegistryItemDescription;
  };
}

/** Preserve shadcn publication policy while checking it against an authored source. */
export function defineShadcnRegistry<
  const Definition extends SourceDefinition,
  const Config extends ShadcnRegistryDefinition<Definition>,
>(_source: Definition, config: Config): Config {
  return config;
}

export interface ShadcnTransformOptions<Definition extends SourceDefinition = SourceDefinition> {
  readonly transformer: SourceTransformer<Definition>;
  readonly styles?: SourceStyleTransform | undefined;
}

export interface ShadcnRegistryOutputFile extends SourceOutputFile {
  readonly kind: 'source' | 'style';
}

export interface ShadcnRegistryOutput {
  readonly files: readonly ShadcnRegistryOutputFile[];
  readonly registry: ShadcnRegistry;
}

export interface ShadcnOutputFile {
  readonly path: string;
  readonly content: string;
}

/** Assemble final Shadcn registry JSON assets from transformed source. */
export function createShadcnRegistryFiles<Definition extends SourceDefinition>(
  output: ShadcnRegistryOutput,
  definition: ShadcnRegistryDefinition<Definition>
): ShadcnOutputFile[] {
  const sources = new Map(output.files.map((file) => [file.path, file.content]));
  const items = output.registry.items.map((item) => {
    const built = {
      $schema: 'https://ui.shadcn.com/schema/registry-item.json',
      ...item,
      ...(item.files
        ? {
            files: item.files.map((file) => {
              const sourcePath = posix.relative(definition.paths.output, file.path);
              const content = sources.get(sourcePath);
              if (content === undefined) throw new Error(`Shadcn registry source does not exist: ${file.path}`);
              return { ...file, content };
            }),
          }
        : {}),
    };

    registryItemSchema.parse(built);
    return { path: `${item.name}.json`, content: JSON.stringify(built) };
  });

  return [{ path: 'registry.json', content: JSON.stringify(output.registry) }, ...items];
}

/** Project editable source modules, shared files, and a validated Shadcn registry. */
export async function createShadcnRegistry<const Definition extends SourceDefinition>(
  source: Source<Definition>,
  definition: ShadcnRegistryDefinition<Definition>,
  options: ShadcnTransformOptions<Definition>
): Promise<ShadcnRegistryOutput> {
  validateDefinition(source, definition);

  const resolved = resolveSource(source, definition.items.published);
  const itemNames = resolved.items.map((item) => item.name);
  const output = await transformSource(source, {
    items: itemNames,
    transformer: {
      ...withRegistryImports(options.transformer, definition.imports),
      cwd: (item) => resolve(source.rootDir, itemOutputDir(item, definition)),
    },
    ...(options.styles ? { styles: options.styles } : {}),
    files: {
      source: ({ sourceItem, sourceFile }) => sourceOutputPath(sourceItem, sourceFile, definition),
    },
    resolve: {
      imports: {
        dependency: ({ dependency }) => dependencyImport(dependency, definition),
      },
    },
  });
  const transformed = mapTransformedItems(output.items);
  const shared = await loadSharedFiles(source, definition);
  const files = uniqueOutputFiles([
    ...shared.flatMap((item) => item.files.map((file) => file.output)),
    ...(Object.values(transformed) as Array<TransformedSourceItem<ShadcnRegistryOutputFile> | undefined>).flatMap(
      (item) => item?.files ?? []
    ),
    ...output.files.style.map((file) => ({ ...file, kind: 'style' as const })),
  ]);

  return {
    files,
    registry: createManifest(source, definition, transformed, shared),
  };
}

function withRegistryImports<Definition extends SourceDefinition>(
  transformer: SourceTransformer<Definition>,
  imports: ShadcnRegistryDefinition<Definition>['imports']
): SourceTransformer<Definition> {
  if (!imports || Object.keys(imports).length === 0) return transformer;

  return {
    ...transformer,
    transform: (item) => {
      const configured = transformer.transform;
      const config = typeof configured === 'function' ? configured(item) : (configured ?? {});
      if (!config.target) return config;

      return {
        ...config,
        target: {
          ...config.target,
          imports: { ...config.target.imports, ...imports },
        },
      };
    },
  };
}

interface LoadedSharedFile {
  readonly definition: ShadcnRegistrySharedFile;
  readonly output: ShadcnRegistryOutputFile;
}

interface LoadedSharedItem {
  readonly definition: ShadcnRegistrySharedItem;
  readonly files: readonly LoadedSharedFile[];
}

function mapTransformedItems<Definition extends SourceDefinition>(
  items: Readonly<Partial<Record<SourceItem<Definition>['name'], TransformedSourceItem>>>
): Readonly<Partial<Record<SourceItem<Definition>['name'], TransformedSourceItem<ShadcnRegistryOutputFile>>>> {
  const entries = Object.entries(items) as Array<[string, TransformedSourceItem | undefined]>;

  return Object.fromEntries(
    entries.map(([name, item]) => [
      name,
      item
        ? {
            ...item,
            files: item.files.map((file) => ({ ...file, kind: 'source' as const })),
          }
        : undefined,
    ])
  ) as Readonly<Partial<Record<SourceItem<Definition>['name'], TransformedSourceItem<ShadcnRegistryOutputFile>>>>;
}

async function loadSharedFiles<Definition extends SourceDefinition>(
  source: Source<Definition>,
  definition: ShadcnRegistryDefinition<Definition>
): Promise<LoadedSharedItem[]> {
  return Promise.all(
    (definition.items.shared ?? []).map(async (item) => ({
      definition: item,
      files: await Promise.all(
        item.files.map(async (file) => {
          const path = posix.join(definition.paths.source, normalizePath(file.path ?? file.source));

          return {
            definition: file,
            output: {
              path,
              content: await readFile(resolve(source.rootDir, file.source), 'utf8'),
              kind: path.endsWith('.css') ? ('style' as const) : ('source' as const),
            },
          };
        })
      ),
    }))
  );
}

function createManifest<Definition extends SourceDefinition>(
  source: Source<Definition>,
  definition: ShadcnRegistryDefinition<Definition>,
  transformed: Readonly<
    Partial<Record<SourceItem<Definition>['name'], TransformedSourceItem<ShadcnRegistryOutputFile>>>
  >,
  shared: readonly LoadedSharedItem[]
): ShadcnRegistry {
  const itemsByName = new Map(source.items.map((item) => [item.name, item]));
  const published = new Set<string>(definition.items.published);
  const registryItems = definition.items.published.map((name): RegistryItem => {
    const item = itemsByName.get(name);

    if (!item) throw new Error(`shadcn registry references missing source item \`${name}\`.`);

    const partition = partitionItemDependencies(item, itemsByName, published);
    const sources = partition.includedItems.map((included) => {
      const source = transformed[included.name as SourceItem<Definition>['name']];

      if (!source) throw new Error(`shadcn registry output is missing source item \`${included.name}\`.`);
      return source;
    });
    const imports = new Set(sources.flatMap((source) => source.imports));
    const { meta, ...description } = definition.items.describe(item);
    const sharedDependencies = shared
      .filter((dependency) => requiredBy(dependency.definition.requiredBy, imports))
      .map((dependency) => dependency.definition.name);
    const registryDependencies = [
      ...new Set([...partition.registryItems.map((dependency) => dependency.name), ...sharedDependencies]),
    ]
      .map((dependency) => `${definition.namespace}/${dependency}`)
      .sort();

    return {
      name: item.name,
      ...description,
      files: uniqueRegistryFiles(
        partition.includedItems.flatMap((included) => {
          const source = transformed[included.name as SourceItem<Definition>['name']]!;
          const owner = definition.items.describe(included);

          return source.files.map((file) => registryFile(file, included.name, owner.type, definition));
        })
      ),
      ...uniqueDependencies(sources.flatMap((source) => source.dependencies)),
      registryDependencies,
      ...mergeMeta(definition.meta, meta),
    };
  });
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
          files: uniqueRegistryFiles(files.map((file) => sharedRegistryFile(file, item, definition))),
          ...(item.dependencies?.length ? { dependencies: [...item.dependencies] } : {}),
          ...mergeMeta(definition.meta, item.meta),
        })
      ),
      ...registryItems,
    ],
  } satisfies ShadcnRegistry;

  registrySchema.parse(registry);
  return registry;
}

function requiredBy(requirement: ShadcnRegistrySharedItem['requiredBy'], imports: ReadonlySet<string>): boolean {
  if (requirement === 'all') return true;
  if (!requirement) return false;

  return requirement.imports.some((specifier) => imports.has(specifier));
}

function registryFile<Definition extends SourceDefinition>(
  file: ShadcnRegistryOutputFile,
  owner: string,
  ownerType: PublishedRegistryItemType,
  definition: ShadcnRegistryDefinition<Definition>
): ShadcnRegistryFile {
  return {
    path: posix.join(definition.paths.output, file.path),
    target: installTarget(file.path, owner, ownerType, definition),
    type: 'registry:component',
  };
}

function sharedRegistryFile<Definition extends SourceDefinition>(
  file: LoadedSharedFile,
  item: ShadcnRegistrySharedItem,
  definition: ShadcnRegistryDefinition<Definition>
): ShadcnRegistryFile {
  const relative = stripSourceRoot(file.output.path, definition.paths.source);

  return {
    path: posix.join(definition.paths.output, file.output.path),
    target: posix.join(definition.paths.install, normalizePath(file.definition.target ?? relative)),
    type:
      file.definition.type ??
      (file.output.kind === 'source' && item.type === 'registry:lib' ? 'registry:lib' : 'registry:file'),
  };
}

function sourceOutputPath<Definition extends SourceDefinition>(
  item: SourceItem<Definition>,
  sourceFile: string,
  definition: ShadcnRegistryDefinition<Definition>
): string {
  const itemDir = itemOutputDir(item, definition);
  const entrySource = normalizePath(item.source);
  const source = normalizePath(sourceFile);

  return source === entrySource
    ? posix.join(itemDir, posix.basename(item.source))
    : privateSourceOutput(itemDir, entrySource, source);
}

function itemOutputDir<Definition extends SourceDefinition>(
  item: SourceItem<Definition>,
  definition: ShadcnRegistryDefinition<Definition>
): string {
  const type = definition.items.describe(item).type;

  return type === 'registry:block'
    ? definition.paths.source
    : posix.join(definition.paths.source, 'components', item.name);
}

function privateSourceOutput(itemDir: string, entrySource: string, source: string): string {
  const relative = posix.relative(posix.dirname(entrySource), source);

  return relative.startsWith('../') ? posix.join(itemDir, 'internal', source) : posix.join(itemDir, relative);
}

function dependencyImport<Definition extends SourceDefinition>(
  dependency: SourceItem<Definition>,
  definition: ShadcnRegistryDefinition<Definition>
): string {
  const output = sourceOutputPath(dependency, dependency.source, definition);
  const relative = stripSourceRoot(output, definition.paths.source).replace(/^components\//, '');
  const module = relative.replace(/\.[^.]+$/, '');

  return posix.join(definition.paths.import, dependency.name, posix.basename(module));
}

function installTarget<Definition extends SourceDefinition>(
  path: string,
  owner: string,
  ownerType: PublishedRegistryItemType,
  definition: ShadcnRegistryDefinition<Definition>
): string {
  const relative = stripSourceRoot(path, definition.paths.source);

  if (relative.startsWith('components/')) {
    return posix.join(definition.paths.install, relative.replace(/^components\//, ''));
  }

  return ownerType === 'registry:block'
    ? posix.join(definition.paths.install, owner, relative)
    : posix.join(definition.paths.install, relative);
}

function stripSourceRoot(path: string, sourceRoot: string): string {
  const prefix = `${normalizePath(sourceRoot)}/`;
  if (!path.startsWith(prefix)) {
    throw new Error(`shadcn registry source file \`${path}\` must be inside \`${sourceRoot}\`.`);
  }

  return path.slice(prefix.length);
}

function normalizePath(path: string): string {
  return path.replace(/^\.\//, '');
}

function validateDefinition<Definition extends SourceDefinition>(
  source: Source<Definition>,
  definition: ShadcnRegistryDefinition<Definition>
): void {
  const sourceNames = new Set(source.items.map((item) => item.name));
  const sharedNames = new Set<string>();

  for (const shared of definition.items.shared ?? []) {
    if (sharedNames.has(shared.name)) {
      throw new Error(`shadcn registry shared item \`${shared.name}\` is declared twice.`);
    }
    if (sourceNames.has(shared.name)) {
      throw new Error(`shadcn registry shared item \`${shared.name}\` conflicts with a source item.`);
    }

    sharedNames.add(shared.name);
  }
}

function partitionItemDependencies<Definition extends SourceDefinition>(
  root: SourceItem<Definition>,
  items: ReadonlyMap<string, SourceItem<Definition>>,
  published: ReadonlySet<string>
): { includedItems: SourceItem<Definition>[]; registryItems: SourceItem<Definition>[] } {
  const includedItems = new Map<string, SourceItem<Definition>>();
  const registryItems = new Map<string, SourceItem<Definition>>();

  const visit = (name: string): void => {
    const item = items.get(name);

    if (!item) throw new Error(`Source item \`${root.name}\` depends on missing item \`${name}\`.`);

    if (name !== root.name && published.has(name)) {
      registryItems.set(name, item);
      return;
    }

    if (includedItems.has(name)) return;
    includedItems.set(name, item);

    for (const dependency of item.dependencies) visit(dependency);
  };

  visit(root.name);

  return {
    includedItems: [...includedItems.values()].sort(compareItems),
    registryItems: [...registryItems.values()].sort(compareItems),
  };
}

function mergeMeta(...values: Array<RegistryItem['meta'] | undefined>): { meta?: RegistryItem['meta'] } {
  const defined = values.filter((value): value is NonNullable<typeof value> => Boolean(value));
  return defined.length > 0 ? { meta: Object.assign({}, ...defined) } : {};
}

function uniqueDependencies(dependencies: readonly string[]): { dependencies?: string[] } {
  const unique = [...new Set(dependencies)].sort();
  return unique.length > 0 ? { dependencies: unique } : {};
}

function uniqueRegistryFiles(files: readonly ShadcnRegistryFile[]): ShadcnRegistryFile[] {
  return uniqBy([...files], (file) => `${file.path}\0${file.target ?? ''}`).sort((left, right) =>
    left.path.localeCompare(right.path)
  );
}

function uniqueOutputFiles(files: readonly ShadcnRegistryOutputFile[]): ShadcnRegistryOutputFile[] {
  const unique = new Map<string, ShadcnRegistryOutputFile>();

  for (const file of files) {
    const previous = unique.get(file.path);
    if (previous && previous.content !== file.content) {
      throw new Error(`shadcn registry output collision: \`${file.path}\`.`);
    }

    unique.set(file.path, file);
  }

  return [...unique.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function compareItems(left: { name: string }, right: { name: string }): number {
  return left.name.localeCompare(right.name);
}
