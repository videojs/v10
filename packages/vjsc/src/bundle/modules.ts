import { resolve } from 'node:path';

import type { GeneratedModule } from '../generate';

export const VIRTUAL_MODULE_PREFIX = 'virtual:vjsc/';

export interface VirtualModuleDefinition {
  readonly id: `${typeof VIRTUAL_MODULE_PREFIX}${string}`;
  load(): GeneratedModule | Promise<GeneratedModule>;
}

/** Preserve a virtual module definition while checking its stable public ID. */
export function defineVirtualModule<const Definition extends VirtualModuleDefinition>(
  definition: Definition
): Definition {
  return definition;
}

export interface BundleModulesOptions {
  readonly modules: readonly VirtualModuleDefinition[];
  /** Map public IDs to filesystem-shaped IDs when downstream transforms need an extension. */
  readonly resolveId?: ((id: VirtualModuleDefinition['id']) => string) | undefined;
}

/** Stateless virtual-module lookup. The host bundler owns loading and invalidation. */
export interface BundleModules {
  readonly ids: readonly VirtualModuleDefinition['id'][];
  resolveId(id: string): string | null;
  publicId(id: string): VirtualModuleDefinition['id'] | null;
  load(id: string): Promise<GeneratedModule | null>;
}

export function createBundleModules(options: BundleModulesOptions): BundleModules {
  const definitions = new Map<VirtualModuleDefinition['id'], VirtualModuleDefinition>();
  const publicIdByResolvedId = new Map<string, VirtualModuleDefinition['id']>();
  const resolvedIdByPublicId = new Map<VirtualModuleDefinition['id'], string>();

  for (const definition of options.modules) {
    if (!definition.id.startsWith(VIRTUAL_MODULE_PREFIX)) {
      throw new Error(`VJSC virtual module IDs must start with \`${VIRTUAL_MODULE_PREFIX}\`: ${definition.id}`);
    }
    if (definitions.has(definition.id)) throw new Error(`Duplicate VJSC virtual module ID: ${definition.id}`);
    definitions.set(definition.id, definition);
  }

  const publicId = (id: string): VirtualModuleDefinition['id'] | null => {
    const resolved = publicIdByResolvedId.get(id);
    if (resolved) return resolved;
    const candidate = (id.startsWith('\0') ? id.slice(1) : id) as VirtualModuleDefinition['id'];
    return definitions.has(candidate) ? candidate : null;
  };

  return {
    ids: [...definitions.keys()].sort(),
    resolveId(id) {
      if (publicIdByResolvedId.has(id)) return id;
      const moduleId = publicId(id);
      if (!moduleId) return null;

      let resolvedId = resolvedIdByPublicId.get(moduleId);
      if (!resolvedId) {
        resolvedId = options.resolveId?.(moduleId) ?? `\0${moduleId}`;
        resolvedIdByPublicId.set(moduleId, resolvedId);
        publicIdByResolvedId.set(resolvedId, moduleId);
      }
      return resolvedId;
    },
    publicId,
    async load(id) {
      const moduleId = publicId(id);
      if (!moduleId) return null;

      const generated = await definitions.get(moduleId)!.load();
      return {
        code: generated.code,
        watchFiles: [...new Set(generated.watchFiles.map((fileName) => resolve(fileName)))].sort(),
      };
    },
  };
}
