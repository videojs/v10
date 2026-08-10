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

export type ResolvedSkinItem = SkinItem & {
  dependencies: readonly string[];
  sourceFiles: readonly string[];
  styleFiles: readonly string[];
  symbols: SkinSymbols;
};

/** Authored Skin metadata enriched with source and dependency analysis. */
export interface ResolvedSkinCatalog {
  resources: SkinResources;
  items: readonly ResolvedSkinItem[];
}

export interface SkinClosure {
  items: readonly ResolvedSkinItem[];
  sourceFiles: readonly string[];
  styleFiles: readonly string[];
  symbols: SkinSymbols;
}
