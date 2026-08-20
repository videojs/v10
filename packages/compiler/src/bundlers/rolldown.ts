import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import { createVirtualModuleGraph, type VirtualModuleDefinition } from '../module-graph';

export interface VideojsCompilerModulesOptions {
  readonly modules: readonly VirtualModuleDefinition[];
  /** Map public IDs to filesystem-shaped IDs when downstream transforms need an extension. */
  readonly resolveId?: ((id: VirtualModuleDefinition['id']) => string) | undefined;
}

/** Load VJSC virtual modules through Rolldown without materializing their source. */
export function vjsCompilerModules(options: VideojsCompilerModulesOptions): Plugin {
  const graph = createVirtualModuleGraph(options.modules);
  const publicIdByResolvedId = new Map<string, VirtualModuleDefinition['id']>();

  return {
    name: 'vjsc:modules',
    resolveId(id) {
      if (publicIdByResolvedId.has(id)) return id;
      if (!graph.has(id)) return null;

      const resolvedId = options.resolveId?.(id) ?? `\0${id}`;
      publicIdByResolvedId.set(resolvedId, id);
      return resolvedId;
    },
    async load(id) {
      const publicId = publicIdByResolvedId.get(id) ?? (graph.has(id) ? id : undefined);
      if (!publicId) return null;

      const generated = await graph.load(publicId);
      if (!generated) return null;
      for (const fileName of generated.watchFiles) this.addWatchFile(resolve(fileName));
      return generated.code;
    },
    watchChange(id) {
      graph.invalidate(id);
    },
  };
}
