import { resolve } from 'node:path';
import { type Catalog, type CatalogItem, loadCatalog } from '@videojs/compiler/catalog';
import { type SkinCatalogDefinition, skinCatalog } from '../canonical/catalog';

export type SkinCatalog = Catalog<SkinCatalogDefinition>;
export type SkinCatalogItem = CatalogItem<SkinCatalogDefinition>;

export const skinsPackageRoot = resolve(import.meta.dirname, '..');
export const canonicalRoot = resolve(skinsPackageRoot, 'canonical');

/** Load and analyze the authored catalog used by every Skin output projection. */
export function loadSkinCatalog(): Promise<SkinCatalog> {
  return loadCatalog(skinCatalog, { rootDir: canonicalRoot });
}
