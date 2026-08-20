import { resolve } from 'node:path';

import type { GeneratedModule } from './generate';

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

/** Bundler-neutral loader and invalidation graph for generated VJSC modules. */
export interface VirtualModuleGraph {
  readonly ids: readonly VirtualModuleDefinition['id'][];
  has(id: string): id is VirtualModuleDefinition['id'];
  load(id: string): Promise<GeneratedModule | null>;
  invalidate(fileName: string): readonly VirtualModuleDefinition['id'][];
  invalidateAll(): void;
}

/** Create a lazily evaluated graph whose generated modules are cached until an input changes. */
export function createVirtualModuleGraph(definitions: readonly VirtualModuleDefinition[]): VirtualModuleGraph {
  const modules = new Map<VirtualModuleDefinition['id'], VirtualModuleDefinition>();
  const loaded = new Map<VirtualModuleDefinition['id'], Promise<GeneratedModule>>();
  const watchedByModule = new Map<VirtualModuleDefinition['id'], Set<string>>();
  const modulesByWatchFile = new Map<string, Set<VirtualModuleDefinition['id']>>();

  for (const definition of definitions) {
    if (!definition.id.startsWith(VIRTUAL_MODULE_PREFIX)) {
      throw new Error(`VJSC virtual module IDs must start with \`${VIRTUAL_MODULE_PREFIX}\`: ${definition.id}`);
    }
    if (modules.has(definition.id)) throw new Error(`Duplicate VJSC virtual module ID: ${definition.id}`);
    modules.set(definition.id, definition);
  }

  const ids = [...modules.keys()].sort();

  const load = async (id: string): Promise<GeneratedModule | null> => {
    const moduleId = parseModuleId(id);
    if (!moduleId || !modules.has(moduleId)) return null;

    let pending = loaded.get(moduleId);
    if (!pending) {
      pending = Promise.resolve(modules.get(moduleId)!.load()).then((generated) => {
        updateWatchFiles(moduleId, generated.watchFiles);
        return {
          code: generated.code,
          watchFiles: [...new Set(generated.watchFiles.map((fileName) => resolve(fileName)))].sort(),
        };
      });
      pending.catch(() => loaded.delete(moduleId));
      loaded.set(moduleId, pending);
    }

    return pending;
  };

  const updateWatchFiles = (id: VirtualModuleDefinition['id'], files: readonly string[]): void => {
    const previous = watchedByModule.get(id) ?? new Set<string>();
    const next = new Set(files.map((fileName) => resolve(fileName)));

    for (const fileName of previous) {
      if (next.has(fileName)) continue;
      const owners = modulesByWatchFile.get(fileName);
      owners?.delete(id);
      if (owners?.size === 0) modulesByWatchFile.delete(fileName);
    }

    for (const fileName of next) {
      const owners = modulesByWatchFile.get(fileName) ?? new Set<VirtualModuleDefinition['id']>();
      owners.add(id);
      modulesByWatchFile.set(fileName, owners);
    }

    watchedByModule.set(id, next);
  };

  return {
    ids,
    has(id): id is VirtualModuleDefinition['id'] {
      const moduleId = parseModuleId(id);
      return moduleId !== null && modules.has(moduleId);
    },
    load,
    invalidate(fileName) {
      const affected = [...(modulesByWatchFile.get(resolve(fileName)) ?? [])].sort();
      for (const id of affected) loaded.delete(id);
      return affected;
    },
    invalidateAll() {
      loaded.clear();
    },
  };
}

function parseModuleId(id: string): VirtualModuleDefinition['id'] | null {
  const publicId = id.startsWith('\0') ? id.slice(1) : id;
  return publicId.startsWith(VIRTUAL_MODULE_PREFIX) ? (publicId as VirtualModuleDefinition['id']) : null;
}
