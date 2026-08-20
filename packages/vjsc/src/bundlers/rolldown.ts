import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';
import {
  type CreateSchemaModuleOptions,
  createSchemaModule,
  type GenerateSchemaConfig,
} from '../components/generate/schema';
import { createGeneratedModuleDeclaration } from '../generate/declaration';
import type { VirtualModuleDefinition } from '../module-graph';
import { createCompilerModules } from './modules';

export interface CompilerDeclarationOutput {
  readonly id: VirtualModuleDefinition['id'];
  /** Source identity used to resolve generated declaration imports. */
  readonly sourceFileName: string;
  /** Declaration asset path relative to the Rolldown output directory. */
  readonly fileName: `${string}.d.ts`;
}

export interface VjscPluginOptions {
  readonly modules: readonly VirtualModuleDefinition[];
  /** Map public IDs to filesystem-shaped IDs when downstream transforms need an extension. */
  readonly resolveId?: ((id: VirtualModuleDefinition['id']) => string) | undefined;
  /** Final declaration assets emitted directly from in-memory generated modules. */
  readonly declarations?: readonly CompilerDeclarationOutput[] | undefined;
}

export interface SchemaPluginOptions extends Omit<GenerateSchemaConfig, 'output'>, CreateSchemaModuleOptions {
  /** Virtual entry consumed by the bundler. */
  readonly id?: VirtualModuleDefinition['id'] | undefined;
  /** Final declaration asset emitted alongside the bundled schema. */
  readonly declaration?: `${string}.d.ts` | false | undefined;
}

export interface SchemaPlugin extends Plugin {
  /** Entry ID to use in the surrounding Rolldown, tsdown, or Vite config. */
  readonly moduleId: VirtualModuleDefinition['id'];
}

/** Load VJSC virtual modules through Rolldown without materializing their source. */
export function vjscPlugin(options: VjscPluginOptions): Plugin {
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

/** Create a virtual component-schema entry directly inside a bundler config. */
export function schemaPlugin(options: SchemaPluginOptions): SchemaPlugin {
  const cwd = resolve(options.cwd ?? process.cwd());
  const moduleId = options.id ?? 'virtual:vjsc/schema';
  const sourceFileName = resolve(cwd, 'vjsc.ts');
  const module: VirtualModuleDefinition = {
    id: moduleId,
    load: () =>
      createSchemaModule(
        {
          source: options.source,
          files: options.files,
          output: sourceFileName,
        },
        { cwd }
      ),
  };
  const plugin = vjscPlugin({
    modules: [module],
    resolveId: () => sourceFileName,
    declarations:
      options.declaration === false || options.declaration === undefined
        ? []
        : [{ id: moduleId, sourceFileName, fileName: options.declaration }],
  });

  return Object.assign(plugin, { moduleId });
}

export default vjscPlugin;
