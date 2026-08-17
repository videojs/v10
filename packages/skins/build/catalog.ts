import { resolve } from 'node:path';
import { type Catalog, type CatalogItem, loadCatalog } from '@videojs/compiler/catalog';
import { type SkinCatalogDefinition, type SkinDefinition, skinCatalog } from '../canonical/catalog';

export type SkinCatalog<Definition extends SkinCatalogDefinition = typeof skinCatalog> = Catalog<Definition>;
export type SkinCatalogItem<Definition extends SkinCatalogDefinition = typeof skinCatalog> = CatalogItem<Definition>;

export const skinsPackageRoot = resolve(import.meta.dirname, '..');
export const canonicalRoot = resolve(skinsPackageRoot, 'canonical');

/** Load and analyze the authored catalog used by every Skin output. */
export function loadSkinCatalog(): Promise<SkinCatalog> {
  return loadCatalog(skinCatalog, { rootDir: canonicalRoot });
}

/** Derive the classes that identify a generated Skin root. */
export function skinRootClassName(skin: SkinDefinition): string {
  return ['media-skin', skin.style.scope, `media-theme-${skin.style.theme}`].join(' ');
}

/** Derive the canonical root component export from a catalog Skin name. */
export function skinRootComponentName(skin: SkinDefinition): string {
  return `${skin.name.replace(/(^|-)([a-z0-9])/g, (_, _separator, character: string) => character.toUpperCase())}Skin`;
}
