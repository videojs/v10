import type { SkinComponent, SkinDefinition } from '../../canonical/manifest';

export type { SkinComponent, SkinDefinition as Skin, SkinManifest } from '../../canonical/manifest';

export type SkinResources = Readonly<Record<string, readonly string[]>>;
export type SkinSymbols = Readonly<Record<string, readonly string[]>>;

export type SkinItem = SkinDefinition | SkinComponent;

export interface SkinSourceFile {
  path: string;
  role: 'entry' | 'source';
}

export interface SkinDependencies {
  items: readonly string[];
  packages: readonly string[];
  symbols: SkinSymbols;
}

export type ResolvedSkinItem = SkinItem & {
  files: readonly SkinSourceFile[];
  resources: SkinResources;
  dependencies: SkinDependencies;
};

export interface ResolvedSkinManifest {
  items: readonly ResolvedSkinItem[];
}

export interface SkinClosure extends SkinDependencies {
  itemNames: readonly string[];
  files: readonly SkinSourceFile[];
  resources: SkinResources;
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

export interface ResolveSkinManifestResult {
  manifest: ResolvedSkinManifest;
  diagnostics: readonly SkinDiagnostic[];
}
