import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import type { VirtualModuleDefinition } from '../module-graph';
import { createCompilerModules } from './modules';

export interface VideojsCompilerPluginOptions {
  readonly modules: readonly VirtualModuleDefinition[];
  /** Map public IDs to filesystem-shaped IDs when downstream transforms need an extension. */
  readonly resolveId?: ((id: VirtualModuleDefinition['id']) => string) | undefined;
}

/** Load VJSC virtual modules through Rolldown without materializing their source. */
export function vjsCompiler(options: VideojsCompilerPluginOptions): Plugin {
  const modules = createCompilerModules(options);

  return {
    name: 'vjsc',
    resolveId: (id) => modules.resolveId(id),
    async load(id) {
      const generated = await modules.load(id);
      if (!generated) return null;
      for (const fileName of generated.watchFiles) this.addWatchFile(resolve(fileName));
      return generated.code;
    },
    watchChange(id) {
      modules.invalidate(id);
    },
  };
}

export default vjsCompiler;
