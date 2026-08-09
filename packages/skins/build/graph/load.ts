import { resolve } from 'node:path';
import { skinManifest } from '../../canonical/manifest';
import { resolveSkinManifest } from './resolve';
import type { ResolvedSkinManifest } from './types';

export const skinsPackageRoot = resolve(import.meta.dirname, '../..');
export const canonicalRoot = resolve(skinsPackageRoot, 'canonical');

export async function loadSkinManifest(): Promise<ResolvedSkinManifest> {
  const result = await resolveSkinManifest(skinManifest, { rootDir: canonicalRoot });
  if (result.diagnostics.length > 0) {
    throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join('\n'));
  }
  return result.manifest;
}
