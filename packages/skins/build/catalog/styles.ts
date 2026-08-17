import { resolve } from 'node:path';

import { loadStyleManifest, type StyleManifest } from '@videojs/compiler/styles';

import { resolveSkinClosure } from './resolve';
import type { ResolvedSkinCatalog } from './types';

export function loadCatalogStyleManifest(
  catalog: ResolvedSkinCatalog,
  options: { rootDir: string; itemNames: readonly string[] }
): Promise<StyleManifest> {
  const files = new Set<string>();

  for (const itemName of options.itemNames) {
    for (const file of resolveSkinClosure(catalog, itemName).styleFiles) {
      files.add(resolve(options.rootDir, file));
    }
  }

  return loadStyleManifest([...files]);
}
