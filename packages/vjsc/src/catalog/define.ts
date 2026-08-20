import { type CatalogItemMeta, type DiscoverCatalogItemsOptions, discoverCatalogItems } from './meta';

export interface CatalogItemDefinition {
  readonly name: string;
  readonly source: string;
}

/** Package import specifiers mapped to the reference group collected from them. */
export type CatalogImports = Readonly<Record<string, string>>;

/** Exact package specifiers or patterns accepted by catalog source modules. */
export type CatalogImportPattern = string | RegExp;

export interface CatalogDefinition {
  readonly items: readonly CatalogItemDefinition[];
  readonly components?: readonly string[] | undefined;
  readonly resources?: object | undefined;
  readonly imports?: CatalogImports | undefined;
  readonly allowedImports?: readonly CatalogImportPattern[] | undefined;
}

export interface CatalogDiscoveryDefinition extends Omit<CatalogDefinition, 'items'> {
  readonly discovery: DiscoverCatalogItemsOptions;
}

export type DiscoveredCatalogDefinition<
  Item extends CatalogItemMeta,
  Definition extends CatalogDiscoveryDefinition,
> = Omit<Definition, 'discovery'> & {
  readonly discovery: Definition['discovery'];
  readonly items: readonly (Item & CatalogItemDefinition)[];
};

export type CatalogItemName<Definition extends CatalogDefinition> = Definition['items'][number]['name'];

/** Preserve authored catalog metadata while checking the compiler contract. */
export function defineCatalog<const Definition extends CatalogDefinition>(definition: Definition): Definition {
  return definition;
}

/** Bind catalog metadata once, then infer the authored discovery and resource configuration. */
export function defineDiscoveredCatalog<Item extends CatalogItemMeta>() {
  return <const Definition extends CatalogDiscoveryDefinition>(
    definition: Definition
  ): DiscoveredCatalogDefinition<Item, Definition> => ({
    ...definition,
    items: discoverCatalogItems<Item>(definition.discovery),
  });
}
