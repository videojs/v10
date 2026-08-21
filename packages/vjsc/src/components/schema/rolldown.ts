import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';
import { createGeneratedModuleDeclaration } from './declaration';
import { type CreateSchemaModuleOptions, createSchemaModule } from './generate';

type VjscModuleId = `virtual:vjsc/${string}`;

export interface SchemaPluginOptions extends Omit<CreateSchemaModuleOptions, 'output'> {
  /** Virtual entry consumed by the bundler. */
  readonly id?: VjscModuleId | undefined;
}

export interface SchemaPlugin extends Plugin {
  /** Entry ID to use in the surrounding Rolldown, tsdown, or Vite config. */
  readonly moduleId: VjscModuleId;
}

/** Create a virtual component-schema entry directly inside a bundler config. */
export function schemaPlugin(options: SchemaPluginOptions): SchemaPlugin {
  const cwd = resolve(options.cwd ?? process.cwd());
  const moduleId = options.id ?? 'virtual:vjsc/schema';
  const sourceFileName = resolve(cwd, 'vjsc.ts');
  const declarationFileName = resolve(cwd, 'vjsc.d.ts');

  const loadSchema = () =>
    createSchemaModule({
      cwd,
      source: options.source,
      include: options.include,
      ...(options.exclude ? { exclude: options.exclude } : {}),
      output: sourceFileName,
    });

  const plugin: Plugin = {
    name: 'vjsc:schema',
    resolveId: {
      filter: { id: exactIds(moduleId, declarationFileName) },
      handler(id) {
        if (id === moduleId) return sourceFileName;
        return id === declarationFileName ? declarationFileName : null;
      },
    },
    load: {
      // Supply the declaration before a host DTS plugin tries to infer it from the virtual source.
      order: 'pre',
      filter: { id: exactIds(sourceFileName, declarationFileName) },
      handler(id) {
        if (id !== sourceFileName && id !== declarationFileName) return null;
        const generated = loadSchema();
        for (const file of generated.watchFiles) this.addWatchFile(file);
        return {
          code: id === sourceFileName ? generated.code : createGeneratedModuleDeclaration(generated, sourceFileName),
          moduleType: 'ts',
        };
      },
    },
  };

  return Object.assign(plugin, { moduleId });
}

function exactIds(...ids: readonly string[]): RegExp {
  return new RegExp(`^(?:${ids.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`);
}
