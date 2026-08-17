import type { CatalogDefinition } from '../catalog/define';
import type { Catalog, CatalogItem } from '../catalog/resolve';
import type { EmittedRegistryItem, RegistrySourceFile } from './emit';

type ShadcnRegistryItemType = 'registry:block' | 'registry:component' | 'registry:lib' | 'registry:style';
export type ShadcnRegistryFileType = 'registry:component' | 'registry:file' | 'registry:lib';

export interface ShadcnRegistryFile {
  readonly path: string;
  readonly type: ShadcnRegistryFileType;
  readonly target: string;
}

interface ShadcnRegistryItem {
  readonly name: string;
  readonly type: ShadcnRegistryItemType;
  readonly title: string;
  readonly description: string;
  readonly files: readonly ShadcnRegistryFile[];
  readonly dependencies?: readonly string[] | undefined;
  readonly registryDependencies?: readonly string[] | undefined;
  readonly meta?: Readonly<Record<string, string>> | undefined;
}

export interface ShadcnRegistry {
  readonly $schema: 'https://ui.shadcn.com/schema/registry.json';
  readonly name: string;
  readonly homepage: string;
  readonly items: readonly ShadcnRegistryItem[];
}

interface ShadcnSharedItem<File extends RegistrySourceFile> {
  readonly name: string;
  readonly type: Extract<ShadcnRegistryItemType, 'registry:lib' | 'registry:style'>;
  readonly title: string;
  readonly description: string;
  readonly files: readonly File[];
  readonly dependencies?: readonly string[] | undefined;
  readonly meta?: Readonly<Record<string, string>> | undefined;
}

interface ShadcnItemDescription {
  readonly type: Extract<ShadcnRegistryItemType, 'registry:block' | 'registry:component'>;
  readonly title: string;
  readonly description: string;
  readonly meta?: Readonly<Record<string, string>> | undefined;
}

export interface CreateShadcnRegistryOptions<
  Definition extends CatalogDefinition = CatalogDefinition,
  File extends RegistrySourceFile = RegistrySourceFile,
> {
  readonly name: string;
  readonly homepage: string;
  readonly namespace: string;
  readonly publishedItems: readonly CatalogItem<Definition>['name'][];
  readonly emittedItems: Readonly<Record<string, EmittedRegistryItem<File>>>;
  readonly shared?: readonly ShadcnSharedItem<File>[] | undefined;
  describeItem(item: CatalogItem<Definition>): ShadcnItemDescription;
  registryDependencies?(context: {
    readonly item: CatalogItem<Definition>;
    readonly bundledItems: readonly CatalogItem<Definition>[];
  }): readonly string[];
  mapFile(file: File, owner: string): ShadcnRegistryFile;
}

/** Create a shadcn manifest from emitted catalog sources and publication policy. */
export function createShadcnRegistry<const Definition extends CatalogDefinition, File extends RegistrySourceFile>(
  catalog: Catalog<Definition>,
  options: CreateShadcnRegistryOptions<Definition, File>
): ShadcnRegistry {
  const items = new Map(catalog.items.map((item) => [item.name, item]));
  const published = new Set<string>(options.publishedItems);
  const sharedNames = new Set<string>();
  for (const shared of options.shared ?? []) {
    if (sharedNames.has(shared.name)) throw new Error(`Registry shared item \`${shared.name}\` is declared twice.`);
    sharedNames.add(shared.name);
    if (items.has(shared.name)) {
      throw new Error(`Registry shared item \`${shared.name}\` conflicts with a catalog item.`);
    }
  }

  const catalogItems = options.publishedItems.map((name): ShadcnRegistryItem => {
    const item = items.get(name);
    if (!item) throw new Error(`Registry references missing catalog item \`${name}\`.`);
    const partition = partitionItemDependencies(item, items, published);
    const sources = partition.bundledItems.map((included) => {
      const source = options.emittedItems[included.name];
      if (!source) throw new Error(`Registry output is missing catalog item \`${included.name}\`.`);
      return source;
    });
    const { meta, ...metadata } = options.describeItem(item);
    const registryDependencies = [
      ...new Set([
        ...(options.registryDependencies?.({ item, bundledItems: partition.bundledItems }) ?? []),
        ...partition.registryItems.map((dependency) => dependency.name),
      ]),
    ]
      .map((dependency) => `${options.namespace}/${dependency}`)
      .sort();

    return {
      name: item.name,
      ...metadata,
      files: uniqueFiles(sources.flatMap((source) => source.files).map((file) => options.mapFile(file, item.name))),
      ...uniqueDependencies(sources.flatMap((source) => source.packageDependencies)),
      registryDependencies,
      ...(meta ? { meta } : {}),
    };
  });

  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: options.name,
    homepage: options.homepage,
    items: [
      ...(options.shared ?? []).map(
        (shared): ShadcnRegistryItem => ({
          name: shared.name,
          type: shared.type,
          title: shared.title,
          description: shared.description,
          files: uniqueFiles(shared.files.map((file) => options.mapFile(file, shared.name))),
          ...(shared.dependencies?.length ? { dependencies: shared.dependencies } : {}),
          ...(shared.meta ? { meta: shared.meta } : {}),
        })
      ),
      ...catalogItems,
    ],
  };
}

function partitionItemDependencies<Definition extends CatalogDefinition>(
  root: CatalogItem<Definition>,
  items: ReadonlyMap<string, CatalogItem<Definition>>,
  published: ReadonlySet<string>
): { bundledItems: CatalogItem<Definition>[]; registryItems: CatalogItem<Definition>[] } {
  const bundledItems = new Map<string, CatalogItem<Definition>>();
  const registryItems = new Map<string, CatalogItem<Definition>>();

  const visit = (name: string): void => {
    const item = items.get(name);
    if (!item) throw new Error(`Catalog item \`${root.name}\` depends on missing item \`${name}\`.`);
    if (name !== root.name && published.has(name)) {
      registryItems.set(name, item);
      return;
    }
    if (bundledItems.has(name)) return;
    bundledItems.set(name, item);
    for (const dependency of item.dependencies) visit(dependency);
  };

  visit(root.name);
  return {
    bundledItems: [...bundledItems.values()].sort(compareItems),
    registryItems: [...registryItems.values()].sort(compareItems),
  };
}

function uniqueDependencies(dependencies: readonly string[]): { dependencies?: readonly string[] } {
  const unique = [...new Set(dependencies)].sort();
  return unique.length > 0 ? { dependencies: unique } : {};
}

function uniqueFiles(files: readonly ShadcnRegistryFile[]): ShadcnRegistryFile[] {
  const unique = new Map<string, ShadcnRegistryFile>();
  for (const file of files) unique.set(`${file.path}\0${file.target}`, file);
  return [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function compareItems(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}
