import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import {
  type CreateSchemaModuleOptions,
  createSchemaModule,
  type GenerateSchemaConfig,
} from '../components/generate/schema';
import type { VirtualModuleDefinition } from './modules';
import { vjscPlugin } from './plugin';

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
    resolveModuleId: () => sourceFileName,
    declarations:
      options.declaration === false || options.declaration === undefined
        ? []
        : [{ id: moduleId, sourceFileName, fileName: options.declaration }],
  });

  return Object.assign(plugin, { moduleId });
}
