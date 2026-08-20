import { type DiscoverVjscModulesOptions, discoverVjscModules, type VjscModuleMeta } from '../../meta';

export interface SourceItemDefinition {
  readonly name: string;
  readonly source: string;
}

/** Package import specifiers mapped to the reference group collected from them. */
export type SourceImports = Readonly<Record<string, string>>;

/** Exact package specifiers or patterns accepted by source modules. */
export type SourceImportPattern = string | RegExp;

export interface SourceDefinition {
  readonly items: readonly SourceItemDefinition[];
  readonly resources?: object | undefined;
  readonly imports?: SourceImports | undefined;
  readonly allowedImports?: readonly SourceImportPattern[] | undefined;
}

export interface SourceDiscoveryDefinition extends Omit<SourceDefinition, 'items'> {
  readonly discovery: DiscoverVjscModulesOptions;
}

export type DiscoveredSourceDefinition<
  Item extends VjscModuleMeta,
  Definition extends SourceDiscoveryDefinition,
> = Omit<Definition, 'discovery'> & {
  readonly discovery: Definition['discovery'];
  readonly items: readonly (Item & SourceItemDefinition)[];
};

export type SourceItemName<Definition extends SourceDefinition> = Definition['items'][number]['name'];

/** Preserve authored source metadata while checking the compiler contract. */
export function defineSource<const Definition extends SourceDefinition>(definition: Definition): Definition {
  return definition;
}

/** Bind source metadata once, then infer the authored discovery and resource configuration. */
export function defineDiscoveredSource<Item extends VjscModuleMeta>() {
  return <const Definition extends SourceDiscoveryDefinition>(
    definition: Definition
  ): DiscoveredSourceDefinition<Item, Definition> => ({
    ...definition,
    items: discoverVjscModules<Item>(definition.discovery),
  });
}
