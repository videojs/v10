import { resolve } from 'node:path';
import { skinManifest } from '../src/manifest';
import { resolveSkinManifest } from './resolve';
import type { ResolvedSkinManifest } from './types';

export const skinsRoot = resolve(import.meta.dirname, '..');

export async function loadSkinManifest(): Promise<ResolvedSkinManifest> {
  const result = await resolveSkinManifest(skinManifest, { rootDir: skinsRoot });
  if (result.diagnostics.length > 0) {
    throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join('\n'));
  }
  return result.manifest;
}
