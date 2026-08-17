export interface CatalogItemDefinition {
  readonly name: string;
  readonly source: string;
}

/** Package import specifiers mapped to the reference group collected from them. */
export type CatalogImports = Readonly<Record<string, string>>;

export interface CatalogDefinition {
  readonly items: readonly CatalogItemDefinition[];
  readonly resources?: object | undefined;
  readonly imports?: CatalogImports | undefined;
}

/** Preserve authored catalog metadata while checking the compiler contract. */
export function catalog<const Definition extends CatalogDefinition>(definition: Definition): Definition {
  return definition;
}
