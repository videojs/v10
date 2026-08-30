import { posix } from 'node:path';

import type { Plugin } from 'rolldown';

import type { NamedModuleMeta } from '../components/meta';
import { findVjscGraph, type VjscGraph } from '../graph';
import { createShadcnRegistryFiles } from '../shadcn/registry';
import type { ShadcnRegistryPluginOptions } from '../shadcn/types';

export type { ShadcnRegistryPluginOptions } from '../shadcn/types';

/** Emit a Shadcn registry from a completed VJSC component graph. */
export function shadcnRegistryPlugin<Item extends NamedModuleMeta>(options: ShadcnRegistryPluginOptions<Item>): Plugin {
  let graph: VjscGraph<Item> | undefined;

  return {
    name: 'vjsc:shadcn-registry',
    buildStart(inputOptions) {
      graph = findVjscGraph<Item>(inputOptions.plugins);

      if (!graph) this.error('The Shadcn registry requires vjscPlugin in the same build.');
    },
    async generateBundle() {
      if (!graph) this.error('The Shadcn registry requires vjscPlugin in the same build.');

      const output = options.output ? normalizeOutput(options.output) : '';

      for (const file of await createShadcnRegistryFiles(graph, options)) {
        const source = file.editable && options.format ? await options.format(file) : file.content;

        this.emitFile({
          type: 'asset',
          fileName: output ? posix.join(output, file.path) : file.path,
          source,
        });
      }
    },
  };
}

function normalizeOutput(path: string): string {
  const output = posix.normalize(path.replaceAll('\\', '/')).replace(/^\.\//, '');

  if (!output || output === '.' || output === '..' || posix.isAbsolute(output) || output.startsWith('../')) {
    throw new Error(`Shadcn registry output must be a non-empty relative path: \`${path}\`.`);
  }

  return output;
}
