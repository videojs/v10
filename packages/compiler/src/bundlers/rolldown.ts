import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import type { VirtualModuleDefinition } from '../module-graph';
import { createGeneratedModuleDeclaration } from '../type-sync';
import { createCompilerModules } from './modules';

export interface CompilerDeclarationOutput {
  readonly id: VirtualModuleDefinition['id'];
  /** Source identity used to resolve generated declaration imports. */
  readonly sourceFileName: string;
  /** Declaration asset path relative to the Rolldown output directory. */
  readonly fileName: `${string}.d.ts`;
}

export interface VideojsCompilerPluginOptions {
  readonly modules: readonly VirtualModuleDefinition[];
  /** Map public IDs to filesystem-shaped IDs when downstream transforms need an extension. */
  readonly resolveId?: ((id: VirtualModuleDefinition['id']) => string) | undefined;
  /** Final declaration assets emitted directly from in-memory generated modules. */
  readonly declarations?: readonly CompilerDeclarationOutput[] | undefined;
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
    async generateBundle() {
      for (const declaration of options.declarations ?? []) {
        const generated = await modules.load(declaration.id);
        if (!generated) throw new Error(`VJSC declaration module does not exist: ${declaration.id}`);

        this.emitFile({
          type: 'asset',
          fileName: declaration.fileName,
          source: createGeneratedModuleDeclaration(generated, resolve(declaration.sourceFileName)),
        });
      }
    },
  };
}

export default vjsCompiler;
