import { resolve } from 'node:path';
import { skinCatalog } from '../../canonical/catalog';
import { resolveSkinCatalog } from './resolve';
import type { ResolvedSkinCatalog } from './types';

export const skinsPackageRoot = resolve(import.meta.dirname, '../..');
export const canonicalRoot = resolve(skinsPackageRoot, 'canonical');

/** Load and analyze the authored catalog used by every Skin output projection. */
export async function loadSkinCatalog(): Promise<ResolvedSkinCatalog> {
  const result = await resolveSkinCatalog(skinCatalog, { rootDir: canonicalRoot });
  if (result.diagnostics.length > 0) {
    throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join('\n'));
  }
  return result.catalog;
}
