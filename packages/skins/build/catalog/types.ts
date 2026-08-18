import type { SkinComponent, SkinDefinition, SkinResources } from '../../canonical/catalog';

export type {
  SkinCatalog,
  SkinComponent,
  SkinDefinition as Skin,
  SkinDependencyKind,
  SkinResources,
  SkinStyleResources,
} from '../../canonical/catalog';

export interface SkinSymbols {
  components: readonly string[];
  icons: readonly string[];
}

export type SkinItem = SkinDefinition | SkinComponent;

interface ResolvedSkinMetadata {
  dependencies: readonly string[];
  sourceFiles: readonly string[];
  styleFiles: readonly string[];
  symbols: SkinSymbols;
}

export type ResolvedSkinItem = (SkinDefinition & ResolvedSkinMetadata) | (SkinComponent & ResolvedSkinMetadata);

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
