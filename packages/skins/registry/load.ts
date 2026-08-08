import { resolve } from 'node:path';
import { registry as definition } from './entries';
import { resolveRegistry } from './resolve';
import type { ResolvedRegistry } from './types';

export const skinsRoot = resolve(import.meta.dirname, '..');

export async function loadRegistry(): Promise<ResolvedRegistry> {
  const result = await resolveRegistry(definition, { rootDir: skinsRoot });
  if (result.diagnostics.length > 0) {
    throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join('\n'));
  }
  return result.registry;
}
