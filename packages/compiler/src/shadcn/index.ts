import { type RegistryItem, registrySchema, type Registry as ShadcnRegistry } from 'shadcn/schema';
import type { CatalogDefinition } from '../catalog/define';
import type { CatalogOutputFile, EmittedCatalogItem } from '../catalog/emit';
import type { Catalog, CatalogItem } from '../catalog/resolve';

type RegistryItemType = RegistryItem['type'];
export type Registry = ShadcnRegistry;
export type RegistryFile = NonNullable<RegistryItem['files']>[number];
export type RegistryFileType = RegistryFile['type'];

type CatalogItemName<Definition extends CatalogDefinition> = Definition['items'][number]['name'];

export interface RegistryConfig<Definition extends CatalogDefinition = CatalogDefinition> {
  readonly name: string;
  readonly homepage: string;
  readonly namespace: string;
  readonly installRoot: string;
  readonly outputDir: string;
  readonly sourceRoot: string;
  readonly entry: CatalogItemName<Definition>;
  readonly framework: string;
  readonly style: string;
  readonly styleItem: {
    readonly name: string;
    readonly title: string;
    readonly description: string;
  };
  readonly utilityItem: {
    readonly name: string;
    readonly title: string;
    readonly description: string;
    readonly source: string;
    readonly target: string;
    readonly dependencies: readonly string[];
  };
  readonly items: readonly CatalogItemName<Definition>[];
}

/** Preserve registry publication policy while checking it against an authored catalog. */
export function defineRegistry<
  const Definition extends CatalogDefinition,
  const Config extends RegistryConfig<Definition>,
>(_catalog: Definition, config: Config): Config {
  return config;
}

interface SharedItem<File extends CatalogOutputFile> {
  readonly name: string;
  readonly type: Extract<RegistryItemType, 'registry:lib' | 'registry:style'>;
  readonly title: string;
  readonly description: string;
  readonly files: readonly File[];
  readonly dependencies?: readonly string[] | undefined;
  readonly meta?: Readonly<Record<string, string>> | undefined;
}

interface ItemDescription {
  readonly type: Extract<RegistryItemType, 'registry:block' | 'registry:component'>;
  readonly title: string;
  readonly description: string;
  readonly meta?: RegistryItem['meta'];
}

export interface RegistryEmitOptions<
  Definition extends CatalogDefinition = CatalogDefinition,
  File extends CatalogOutputFile = CatalogOutputFile,
> {
  readonly name: string;
  readonly homepage: string;
  readonly namespace: string;
  readonly items: {
    readonly published: readonly CatalogItem<Definition>['name'][];
    readonly emitted: Readonly<Partial<Record<CatalogItem<Definition>['name'], EmittedCatalogItem<File>>>>;
    readonly shared?: readonly SharedItem<File>[] | undefined;
    describe(item: CatalogItem<Definition>): ItemDescription;
  };
  readonly resolve: {
    /** Add registry dependencies that are not represented by catalog edges. */
    dependencies?(context: {
      readonly item: CatalogItem<Definition>;
      readonly includedItems: readonly CatalogItem<Definition>[];
    }): readonly string[];
    file(file: File, itemName: string): RegistryFile;
  };
}

/** Create a shadcn manifest from emitted catalog sources and publication policy. */
export function emitRegistry<const Definition extends CatalogDefinition, File extends CatalogOutputFile>(
  catalog: Catalog<Definition>,
  options: RegistryEmitOptions<Definition, File>
): Registry {
  const itemsByName = new Map(catalog.items.map((item) => [item.name, item]));
  const published = new Set<string>(options.items.published);
  const sharedNames = new Set<string>();

  for (const shared of options.items.shared ?? []) {
    if (sharedNames.has(shared.name)) {
      throw new Error(`Registry shared item \`${shared.name}\` is declared twice.`);
    }

    sharedNames.add(shared.name);

    if (itemsByName.has(shared.name)) {
      throw new Error(`Registry shared item \`${shared.name}\` conflicts with a catalog item.`);
    }
  }

  const catalogItems = options.items.published.map((name): RegistryItem => {
    const item = itemsByName.get(name);

    if (!item) throw new Error(`Registry references missing catalog item \`${name}\`.`);

    const partition = partitionItemDependencies(item, itemsByName, published);

    const sources = partition.includedItems.map((included) => {
      const source = options.items.emitted[included.name as CatalogItem<Definition>['name']];

      if (!source) throw new Error(`Registry output is missing catalog item \`${included.name}\`.`);

      return source;
    });

    const { meta, ...metadata } = options.items.describe(item);

    const registryDependencies = [
      ...new Set([
        ...(options.resolve.dependencies?.({ item, includedItems: partition.includedItems }) ?? []),
        ...partition.registryItems.map((dependency) => dependency.name),
      ]),
    ]
      .map((dependency) => `${options.namespace}/${dependency}`)
      .sort();

    return {
      name: item.name,
      ...metadata,
      files: uniqueFiles(
        sources.flatMap((source) => source.files).map((file) => options.resolve.file(file, item.name))
      ),
      ...uniqueDependencies(sources.flatMap((source) => source.dependencies)),
      registryDependencies,
      ...(meta ? { meta } : {}),
    };
  });

  const registry = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: options.name,
    homepage: options.homepage,
    items: [
      ...(options.items.shared ?? []).map(
        (shared): RegistryItem => ({
          name: shared.name,
          type: shared.type,
          title: shared.title,
          description: shared.description,
          files: uniqueFiles(shared.files.map((file) => options.resolve.file(file, shared.name))),
          ...(shared.dependencies?.length ? { dependencies: [...shared.dependencies] } : {}),
          ...(shared.meta ? { meta: shared.meta } : {}),
        })
      ),
      ...catalogItems,
    ],
  } satisfies ShadcnRegistry;

  registrySchema.parse(registry);
  return registry;
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

function uniqueDependencies(dependencies: readonly string[]): { dependencies?: string[] } {
  const unique = [...new Set(dependencies)].sort();

  return unique.length > 0 ? { dependencies: unique } : {};
}

function uniqueFiles(files: readonly RegistryFile[]): RegistryFile[] {
  const unique = new Map<string, RegistryFile>();

  for (const file of files) unique.set(`${file.path}\0${file.target ?? ''}`, file);

  return [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function compareItems(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}
