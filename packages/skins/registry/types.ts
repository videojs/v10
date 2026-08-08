export type RegistryItemType = 'component' | 'skin';
export type RegistryFramework = 'html' | 'react';
export type RegistryResources = Readonly<Record<string, readonly string[]>>;
export type RegistrySymbols = Readonly<Record<string, readonly string[]>>;

interface RegistryItemBase {
  name: string;
  type: RegistryItemType;
  source: string;
}

export interface PublishedRegistryItem extends RegistryItemBase {
  title: string;
  description: string;
  targets: readonly RegistryFramework[];
  internal?: false | undefined;
}

export interface InternalRegistryItem extends RegistryItemBase {
  internal: true;
  title?: never;
  description?: never;
  targets?: never;
}

export type RegistryItem = PublishedRegistryItem | InternalRegistryItem;

export interface RegistryDefinition {
  resources: RegistryResources;
  dependencyModules: Readonly<Record<string, string>>;
  items: readonly RegistryItem[];
}

export interface RegistryFile {
  path: string;
  role: 'entry' | 'source';
}

export interface RegistryDependencies {
  items: readonly string[];
  packages: readonly string[];
  symbols: RegistrySymbols;
}

export type ResolvedRegistryItem = RegistryItem & {
  files: readonly RegistryFile[];
  resources: RegistryResources;
  dependencies: RegistryDependencies;
};

export interface ResolvedRegistry {
  items: readonly ResolvedRegistryItem[];
}

export interface RegistryClosure extends RegistryDependencies {
  itemNames: readonly string[];
  files: readonly RegistryFile[];
  resources: RegistryResources;
}

export interface RegistryDiagnostic {
  level: 'error';
  code: string;
  message: string;
  plugin: 'videojs/skins-registry';
  file?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
}

export interface ResolveRegistryResult {
  registry: ResolvedRegistry;
  diagnostics: readonly RegistryDiagnostic[];
}

/** Preserve literal fields while checking a registry item definition. */
export function defineRegistryItem<const Item extends RegistryItem>(item: Item): Item {
  return item;
}
