import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import {
  type CreateSchemaModuleOptions,
  createSchemaModule,
  type GenerateSchemaConfig,
} from '../components/generate/schema';
import { createGeneratedModuleDeclaration } from './declaration';

type VjscModuleId = `virtual:vjsc/${string}`;

export interface SchemaPluginOptions extends Omit<GenerateSchemaConfig, 'output'>, CreateSchemaModuleOptions {
  /** Virtual entry consumed by the bundler. */
  readonly id?: VjscModuleId | undefined;
  /** Final declaration asset emitted alongside the bundled schema. */
  readonly declaration?: `${string}.d.ts` | false | undefined;
}

export interface SchemaPlugin extends Plugin {
  /** Entry ID to use in the surrounding Rolldown, tsdown, or Vite config. */
  readonly moduleId: VjscModuleId;
}

/** Create a virtual component-schema entry directly inside a bundler config. */
export function createSchemaPlugin(options: SchemaPluginOptions): SchemaPlugin {
  const cwd = resolve(options.cwd ?? process.cwd());
  const moduleId = options.id ?? 'virtual:vjsc/schema';
  const sourceFileName = resolve(cwd, 'vjsc.ts');

  const loadSchema = () =>
    createSchemaModule(
      {
        source: options.source,
        include: options.include,
        ...(options.exclude ? { exclude: options.exclude } : {}),
        output: sourceFileName,
      },
      { cwd }
    );

  const plugin: Plugin = {
    name: 'vjsc:schema',
    resolveId: {
      filter: { id: exactId(moduleId) },
      handler(id) {
        return id === moduleId ? sourceFileName : null;
      },
    },
    load: {
      filter: { id: exactId(sourceFileName) },
      handler(id) {
        if (id !== sourceFileName) return null;
        const generated = loadSchema();
        for (const file of generated.watchFiles) this.addWatchFile(file);
        return { code: generated.code, moduleType: 'ts' };
      },
    },
    generateBundle() {
      if (!options.declaration) return;
      const generated = loadSchema();
      for (const file of generated.watchFiles) this.addWatchFile(file);
      this.emitFile({
        type: 'asset',
        fileName: options.declaration,
        source: createGeneratedModuleDeclaration(generated, sourceFileName),
      });
    },
  };

  return Object.assign(plugin, { moduleId });
}

function exactId(id: string): RegExp {
  return new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}
