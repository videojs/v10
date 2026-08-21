import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import { addInputEntries } from '../../rolldown/input';
import { createDeclaration } from '../../ts/declaration';
import { type CreateSchemaModuleOptions, createSchemaModule } from './generate';

export interface SchemaPluginOptions extends Omit<CreateSchemaModuleOptions, 'cwd' | 'output'> {
  readonly file?: string | undefined;
}

export function createSchemaPlugin(config: SchemaPluginOptions, declaration: boolean): Plugin {
  const entry = config.file ?? 'vjsc';
  const moduleId = `\0vjsc:schema:${entry}`;

  let cwd: string, output: string, declarationOutput: string;

  return {
    name: 'vjsc:schema',
    options(options) {
      cwd = resolve(options.cwd ?? process.cwd());
      output = resolve(cwd, `${entry}.ts`);
      declarationOutput = resolve(cwd, `${entry}.d.ts`);

      return {
        ...options,
        input: addInputEntries(options.input, {
          [entry]: moduleId,
          ...(declaration ? { [`${entry}.d`]: declarationOutput } : {}),
        }),
      };
    },
    resolveId(id) {
      if (id === moduleId) return output;
      return id === declarationOutput ? declarationOutput : null;
    },
    load: {
      order: 'pre',
      handler(id) {
        if (id !== output && id !== declarationOutput) return null;

        const generated = createSchemaModule({
          cwd,
          source: config.source,
          include: config.include,
          exclude: config.exclude,
          output,
        });

        for (const file of generated.watchFiles) this.addWatchFile(file);

        return {
          code: id === output ? generated.code : createDeclaration(generated.code, output),
          moduleType: 'ts',
        };
      },
    },
  };
}
