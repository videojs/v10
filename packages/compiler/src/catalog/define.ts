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

export type CatalogItemName<Definition extends CatalogDefinition> = Definition['items'][number]['name'];

/** Preserve authored catalog metadata while checking the compiler contract. */
export function defineCatalog<const Definition extends CatalogDefinition>(definition: Definition): Definition {
  return definition;
}
