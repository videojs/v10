import { resolve } from 'node:path';
import { skinCatalog } from '../../canonical/catalog';
import { resolveSkinCatalog } from './resolve';
import type { ResolvedSkinCatalog } from './types';

export const skinsPackageRoot = resolve(import.meta.dirname, '../..');
export const canonicalRoot = resolve(skinsPackageRoot, 'canonical');

/** Load and analyze the authored catalog used by every Skin output projection. */
export async function loadSkinCatalog(): Promise<ResolvedSkinCatalog> {
  return resolveSkinCatalog(skinCatalog, { rootDir: canonicalRoot });
}
