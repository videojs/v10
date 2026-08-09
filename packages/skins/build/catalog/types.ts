import type { SkinComponent, SkinDefinition, SkinResources } from '../../canonical/catalog';

export type {
  SkinCatalog,
  SkinComponent,
  SkinDefinition as Skin,
  SkinResources,
  SkinStyleResources,
} from '../../canonical/catalog';

type SkinSymbols = Readonly<Record<string, readonly string[]>>;

export type SkinItem = SkinDefinition | SkinComponent;

export interface SkinDependencies {
  itemNames: readonly string[];
  symbols: SkinSymbols;
}

export type ResolvedSkinItem = SkinItem & {
  files: readonly string[];
  dependencies: SkinDependencies;
};

/** Authored Skin metadata enriched with source and dependency analysis. */
export interface ResolvedSkinCatalog {
  resources: SkinResources;
  items: readonly ResolvedSkinItem[];
}

export interface SkinClosure {
  itemNames: readonly string[];
  files: readonly string[];
  symbols: SkinSymbols;
}

export interface SkinDiagnostic {
  level: 'error';
  code: string;
  message: string;
  plugin: 'videojs/skins';
  file?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
}

export interface ResolveSkinCatalogResult {
  catalog: ResolvedSkinCatalog;
  diagnostics: readonly SkinDiagnostic[];
}
