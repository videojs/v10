import type { GeneratedModule } from '../generate';
import { createVirtualModuleGraph, type VirtualModuleDefinition } from '../module-graph';

export interface CompilerModulesOptions {
  readonly modules: readonly VirtualModuleDefinition[];
  readonly resolveId?: ((id: VirtualModuleDefinition['id']) => string) | undefined;
}

/** Shared virtual-module state used by Rolldown and its Vite development adapter. */
export interface CompilerModules {
  readonly ids: readonly VirtualModuleDefinition['id'][];
  has(id: string): boolean;
  resolveId(id: string): string | null;
  publicId(id: string): VirtualModuleDefinition['id'] | null;
  resolvedId(id: VirtualModuleDefinition['id']): string | null;
  load(id: string): Promise<GeneratedModule | null>;
  invalidate(fileName: string): readonly VirtualModuleDefinition['id'][];
}

export function createCompilerModules(options: CompilerModulesOptions): CompilerModules {
  const graph = createVirtualModuleGraph(options.modules);
  const publicIdByResolvedId = new Map<string, VirtualModuleDefinition['id']>();
  const resolvedIdByPublicId = new Map<VirtualModuleDefinition['id'], string>();

  const publicId = (id: string): VirtualModuleDefinition['id'] | null => {
    const resolved = publicIdByResolvedId.get(id);
    if (resolved) return resolved;
    return graph.has(id) ? ((id.startsWith('\0') ? id.slice(1) : id) as VirtualModuleDefinition['id']) : null;
  };

  return {
    ids: graph.ids,
    has: (id) => publicId(id) !== null,
    resolveId(id) {
      if (publicIdByResolvedId.has(id)) return id;
      if (!graph.has(id)) return null;

      const moduleId = (id.startsWith('\0') ? id.slice(1) : id) as VirtualModuleDefinition['id'];
      let resolvedId = resolvedIdByPublicId.get(moduleId);
      if (!resolvedId) {
        resolvedId = options.resolveId?.(moduleId) ?? `\0${moduleId}`;
        resolvedIdByPublicId.set(moduleId, resolvedId);
        publicIdByResolvedId.set(resolvedId, moduleId);
      }
      return resolvedId;
    },
    publicId,
    resolvedId: (id) => resolvedIdByPublicId.get(id) ?? null,
    async load(id) {
      const moduleId = publicId(id);
      return moduleId ? graph.load(moduleId) : null;
    },
    invalidate: (fileName) => graph.invalidate(fileName),
  };
}
