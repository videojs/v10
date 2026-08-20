import { resolve } from 'node:path';
import { loadStyleManifest, type StyleManifest } from '../styles/manifest';
import type { CatalogDefinition } from './define';
import { type Catalog, resolveCatalog } from './resolve';

/** Load the style modules required by one or more catalog items. */
export function loadCatalogStyles<const Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  itemNames: readonly Definition['items'][number]['name'][]
): Promise<StyleManifest> {
  const files = resolveCatalog(catalog, itemNames).files.style.map((file) => resolve(catalog.rootDir, file));
  return loadStyleManifest(files);
}
