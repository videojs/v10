import { posix } from 'node:path';

import type { Plugin } from 'rolldown';

import type { ComponentMeta } from '../components/meta';
import { createShadcnRegistryFiles } from '../shadcn/registry';
import type { ComponentGraphProvider, ShadcnRegistryPluginOptions } from '../shadcn/types';

export type { ShadcnRegistryPluginOptions } from '../shadcn/types';

/** Emit a Shadcn registry from a completed VJSC component graph. */
export function shadcnRegistryPlugin<Item extends ComponentMeta>(
  graph: ComponentGraphProvider<Item>,
  options: ShadcnRegistryPluginOptions<Item>
): Plugin {
  return {
    name: 'vjsc:shadcn-registry',
    async generateBundle() {
      if (!graph.api) this.error('The Shadcn registry requires a VJSC component graph plugin.');

      const output = options.output ? normalizeOutput(options.output) : '';

      for (const file of await createShadcnRegistryFiles(graph.api.getGraph(), options)) {
        this.emitFile({
          type: 'asset',
          fileName: output ? posix.join(output, file.path) : file.path,
          source: file.content,
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
