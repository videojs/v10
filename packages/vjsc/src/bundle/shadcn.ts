import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import { createShadcnRegistry, createShadcnRegistryFiles, type ShadcnRegistryDefinition } from '../shadcn';
import type { SourceDefinition } from '../shadcn/source/define';
import type { SourceStyleTransform, SourceTransformer } from '../shadcn/source/project';
import { loadSource } from '../shadcn/source/resolve';

export interface ShadcnPluginOptions<Definition extends SourceDefinition> {
  readonly source: Definition;
  readonly rootDir: string;
  readonly registry: ShadcnRegistryDefinition<Definition>;
  readonly transformer: SourceTransformer<Definition>;
  readonly styles?: SourceStyleTransform | undefined;
  readonly id?: `virtual:vjsc/${string}` | undefined;
}

export interface ShadcnPlugin extends Plugin {
  readonly moduleId: `virtual:vjsc/${string}`;
}

/** Shared implementation used by the public Vite and Rolldown adapters. */
export function createShadcnPlugin<const Definition extends SourceDefinition>(
  options: ShadcnPluginOptions<Definition>
): ShadcnPlugin {
  const moduleId = options.id ?? 'virtual:vjsc/shadcn';
  const resolvedId = `\0${moduleId}`;
  const plugin: Plugin = {
    name: 'vjsc:shadcn',
    resolveId: {
      filter: { id: exactId(moduleId) },
      handler(id) {
        return id === moduleId ? resolvedId : null;
      },
    },
    load: {
      filter: { id: exactId(resolvedId) },
      handler(id) {
        return id === resolvedId ? 'export default null;' : null;
      },
    },
    async generateBundle(_outputOptions, bundle) {
      const chunks = Object.entries(bundle).filter(
        (entry): entry is [string, Extract<(typeof bundle)[string], { type: 'chunk' }>] =>
          entry[1].type === 'chunk' && entry[1].facadeModuleId === resolvedId
      );
      if (chunks.length === 0) return;

      const source = await loadSource(options.source, { rootDir: options.rootDir });
      const output = await createShadcnRegistry(source, options.registry, {
        transformer: options.transformer,
        ...(options.styles ? { styles: options.styles } : {}),
      });
      const files = createShadcnRegistryFiles(output, options.registry);
      const watchFiles = new Set(
        source.items.flatMap((item) =>
          [...item.files.source, ...item.files.style].map((fileName) => resolve(source.rootDir, fileName))
        )
      );
      for (const item of options.registry.items.shared ?? []) {
        for (const file of item.files) watchFiles.add(resolve(source.rootDir, file.source));
      }

      for (const file of watchFiles) this.addWatchFile(file);
      for (const file of files) this.emitFile({ type: 'asset', fileName: file.path, source: file.content });
      for (const [fileName] of chunks) delete bundle[fileName];
    },
  };

  return Object.assign(plugin, { moduleId });
}

function exactId(id: string): RegExp {
  return new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}
