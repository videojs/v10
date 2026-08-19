import { readFile } from 'node:fs/promises';
import { posix, resolve } from 'node:path';

import { uniqBy } from '@videojs/utils/array';
import { type RegistryItem, registrySchema, type Registry as ShadcnRegistrySchema } from 'shadcn/schema';

import type { CatalogDefinition } from '../catalog/define';
import {
  type CatalogOutputAdapter,
  type CatalogOutputFile,
  type CatalogStyleTransform,
  type EmittedCatalogItem,
  emitCatalog,
} from '../catalog/emit';
import { type Catalog, type CatalogItem, resolveCatalog } from '../catalog/resolve';

type RegistryItemType = RegistryItem['type'];
type PublishedRegistryItemType = Extract<RegistryItemType, 'registry:block' | 'registry:component'>;
type SharedRegistryItemType = Extract<RegistryItemType, 'registry:lib' | 'registry:style'>;

export type ShadcnRegistry = ShadcnRegistrySchema;
export type ShadcnRegistryFile = NonNullable<RegistryItem['files']>[number];
export type ShadcnRegistryFileType = ShadcnRegistryFile['type'];

export interface ShadcnRegistrySharedFile {
  /** Catalog-relative input file. */
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

export interface ShadcnRegistryDefinition<Definition extends CatalogDefinition = CatalogDefinition> {
  readonly name: string;
  readonly homepage: string;
  readonly namespace: string;
  readonly paths: {
    readonly output: string;
    readonly source: string;
    readonly install: string;
    readonly import: string;
  };
  readonly meta?: RegistryItem['meta'];
  readonly items: {
    readonly published: readonly CatalogItem<Definition>['name'][];
    readonly shared?: readonly ShadcnRegistrySharedItem[] | undefined;
    describe(item: CatalogItem<Definition>): ShadcnRegistryItemDescription;
  };
}

/** Preserve shadcn publication policy while checking it against an authored catalog. */
export function defineShadcnRegistry<
  const Definition extends CatalogDefinition,
  const Config extends ShadcnRegistryDefinition<Definition>,
>(_catalog: Definition, config: Config): Config {
  return config;
}

export interface EmitShadcnRegistryOptions<Definition extends CatalogDefinition = CatalogDefinition> {
  readonly output: CatalogOutputAdapter<Definition>;
  readonly styles?: CatalogStyleTransform | undefined;
}

export interface ShadcnRegistryOutputFile extends CatalogOutputFile {
  readonly kind: 'source' | 'style';
}

export interface ShadcnRegistryOutput {
  readonly files: readonly ShadcnRegistryOutputFile[];
  readonly registry: ShadcnRegistry;
}

/** Emit editable catalog modules, shared files, and a validated shadcn registry. */
export async function emitShadcnRegistry<const Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  definition: ShadcnRegistryDefinition<Definition>,
  options: EmitShadcnRegistryOptions<Definition>
): Promise<ShadcnRegistryOutput> {
  validateDefinition(catalog, definition);

  const resolved = resolveCatalog(catalog, definition.items.published);
  const itemNames = resolved.items.map((item) => item.name);
  const output = await emitCatalog(catalog, {
    items: itemNames,
    output: {
      ...options.output,
      configDir: (item) => resolve(catalog.rootDir, itemOutputDir(item, definition)),
    },
    ...(options.styles ? { styles: options.styles } : {}),
    files: {
      source: ({ catalogItem, sourceFile }) => sourceOutputPath(catalogItem, sourceFile, definition),
    },
    resolve: {
      imports: {
        dependency: ({ dependency }) => dependencyImport(dependency, definition),
      },
    },
  });
  const emitted = mapEmittedItems(output.items);
  const shared = await loadSharedFiles(catalog, definition);
  const files = uniqueOutputFiles([
    ...shared.flatMap((item) => item.files.map((file) => file.output)),
    ...(Object.values(emitted) as Array<EmittedCatalogItem<ShadcnRegistryOutputFile> | undefined>).flatMap(
      (item) => item?.files ?? []
    ),
    ...output.files.style.map((file) => ({ ...file, kind: 'style' as const })),
  ]);

  return {
    files,
    registry: createManifest(catalog, definition, emitted, shared),
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

function mapEmittedItems<Definition extends CatalogDefinition>(
  items: Readonly<Partial<Record<CatalogItem<Definition>['name'], EmittedCatalogItem>>>
): Readonly<Partial<Record<CatalogItem<Definition>['name'], EmittedCatalogItem<ShadcnRegistryOutputFile>>>> {
  const entries = Object.entries(items) as Array<[string, EmittedCatalogItem | undefined]>;

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
  ) as Readonly<Partial<Record<CatalogItem<Definition>['name'], EmittedCatalogItem<ShadcnRegistryOutputFile>>>>;
}

async function loadSharedFiles<Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
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
              content: await readFile(resolve(catalog.rootDir, file.source), 'utf8'),
              kind: path.endsWith('.css') ? ('style' as const) : ('source' as const),
            },
          };
        })
      ),
    }))
  );
}

function createManifest<Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  definition: ShadcnRegistryDefinition<Definition>,
  emitted: Readonly<Partial<Record<CatalogItem<Definition>['name'], EmittedCatalogItem<ShadcnRegistryOutputFile>>>>,
  shared: readonly LoadedSharedItem[]
): ShadcnRegistry {
  const itemsByName = new Map(catalog.items.map((item) => [item.name, item]));
  const published = new Set<string>(definition.items.published);
  const registryItems = definition.items.published.map((name): RegistryItem => {
    const item = itemsByName.get(name);

    if (!item) throw new Error(`shadcn registry references missing catalog item \`${name}\`.`);

    const partition = partitionItemDependencies(item, itemsByName, published);
    const sources = partition.includedItems.map((included) => {
      const source = emitted[included.name as CatalogItem<Definition>['name']];

      if (!source) throw new Error(`shadcn registry output is missing catalog item \`${included.name}\`.`);
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
          const source = emitted[included.name as CatalogItem<Definition>['name']]!;
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

function registryFile<Definition extends CatalogDefinition>(
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

function sharedRegistryFile<Definition extends CatalogDefinition>(
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

function sourceOutputPath<Definition extends CatalogDefinition>(
  item: CatalogItem<Definition>,
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

function itemOutputDir<Definition extends CatalogDefinition>(
  item: CatalogItem<Definition>,
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

function dependencyImport<Definition extends CatalogDefinition>(
  dependency: CatalogItem<Definition>,
  definition: ShadcnRegistryDefinition<Definition>
): string {
  const output = sourceOutputPath(dependency, dependency.source, definition);
  const relative = stripSourceRoot(output, definition.paths.source).replace(/^components\//, '');
  const module = relative.replace(/\.[^.]+$/, '');

  return posix.join(definition.paths.import, dependency.name, posix.basename(module));
}

function installTarget<Definition extends CatalogDefinition>(
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

function validateDefinition<Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  definition: ShadcnRegistryDefinition<Definition>
): void {
  const catalogNames = new Set(catalog.items.map((item) => item.name));
  const sharedNames = new Set<string>();

  for (const shared of definition.items.shared ?? []) {
    if (sharedNames.has(shared.name)) {
      throw new Error(`shadcn registry shared item \`${shared.name}\` is declared twice.`);
    }
    if (catalogNames.has(shared.name)) {
      throw new Error(`shadcn registry shared item \`${shared.name}\` conflicts with a catalog item.`);
    }

    sharedNames.add(shared.name);
  }
}

function partitionItemDependencies<Definition extends CatalogDefinition>(
  root: CatalogItem<Definition>,
  items: ReadonlyMap<string, CatalogItem<Definition>>,
  published: ReadonlySet<string>
): { includedItems: CatalogItem<Definition>[]; registryItems: CatalogItem<Definition>[] } {
  const includedItems = new Map<string, CatalogItem<Definition>>();
  const registryItems = new Map<string, CatalogItem<Definition>>();

  const visit = (name: string): void => {
    const item = items.get(name);

    if (!item) throw new Error(`Catalog item \`${root.name}\` depends on missing item \`${name}\`.`);

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
