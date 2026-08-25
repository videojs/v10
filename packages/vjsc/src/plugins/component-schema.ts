import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import { type CreateSchemaModuleOptions, createSchemaModule } from '../components/schema/generate';
import { addInputEntries } from './input';

export interface ComponentSchemaPluginOptions extends Omit<CreateSchemaModuleOptions, 'cwd' | 'output'> {
  readonly file?: string | undefined;
  /** Add a companion declaration entry when the host has a declaration pipeline. */
  readonly declaration?: boolean | undefined;
}

/**
 * Generate a build entry that exports schemas for matching components. Use in package builds that publish a typed
 * component schema.
 *
 * @example
 *   ```ts
 *   componentSchemaPlugin({
 *     source: '@videojs/core/vjsc',
 *     include: ['./src/components/*-component.ts'],
 *   });
 *   ```;
 *
 * @param config - Component discovery and output settings.
 */
export function componentSchemaPlugin(config: ComponentSchemaPluginOptions): Plugin {
  const entry = config.file ?? 'component-schema';
  const moduleId = `\0vjsc:component-schema:${entry}`;

  let cwd: string, output: string, declarationOutput: string;

  return {
    name: 'vjsc:component-schema',
    options(options) {
      cwd = resolve(options.cwd ?? process.cwd());
      output = resolve(cwd, `${entry}.ts`);
      declarationOutput = resolve(cwd, `${entry}.d.ts`);

      return {
        ...options,
        input: addInputEntries(options.input, {
          [entry]: moduleId,
          ...(config.declaration ? { [`${entry}.d`]: declarationOutput } : {}),
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
          code: id === output ? generated.code : generated.declaration,
          moduleType: 'ts',
        };
      },
    },
  };
}
