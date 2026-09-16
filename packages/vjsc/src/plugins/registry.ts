import { posix, resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import type { ModuleMeta } from '../components/meta';
import { findGraph, type Graph } from '../graph';
import { createShadcnRegistryFiles } from '../shadcn/registry';
import type { VjscRegistryOptions } from '../shadcn/types';

export type { VjscRegistryOptions } from '../shadcn/types';

/** Emit a Shadcn registry from the finalized graph exposed by `vjscPlugin`. */
export function vjscRegistryPlugin<Node extends ModuleMeta>(options: VjscRegistryOptions<Node>): Plugin {
  let graph: Graph<Node> | undefined;

  return {
    name: 'vjsc:registry',
    buildStart(inputOptions) {
      graph = findGraph<Node>(inputOptions.plugins);

      if (!graph) this.error('The Shadcn registry requires vjscPlugin in the same build.');
    },
    async generateBundle() {
      if (!graph) this.error('The Shadcn registry requires vjscPlugin in the same build.');

      const output = options.output ? normalizeOutput(options.output) : '';
      const files = await createShadcnRegistryFiles(graph, options);

      if (options.styles?.theme?.tailwind) {
        this.addWatchFile(resolve(graph.root, options.styles.theme.tailwind));
      }

      for (const file of files) {
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
