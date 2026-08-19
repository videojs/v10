import { resolve } from 'node:path';
import { type Catalog, loadCatalog } from 'vjsc/catalog';
import { skinCatalog } from '../canonical/catalog';

export type SkinCatalog = Catalog<typeof skinCatalog>;
export type SkinCatalogItem = SkinCatalog['items'][number];
export type SkinCatalogSkin = Extract<SkinCatalogItem, { type: 'skin' }>;

export const skinsPackageRoot = resolve(import.meta.dirname, '..');
export const canonicalRoot = resolve(skinsPackageRoot, 'canonical');

/** Load and analyze the authored catalog used by every Skin output. */
export function loadSkinCatalog(): Promise<SkinCatalog> {
  return loadCatalog(skinCatalog, { rootDir: canonicalRoot });
}

export function catalogSourcePath(path: string): string {
  return path.replace(/^\.\//, '');
}
