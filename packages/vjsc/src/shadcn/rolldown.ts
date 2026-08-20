import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import { type ComponentMeta, extractComponentMeta } from '../components/meta';
import { readVjscInput, readVjscSource } from '../ts/rolldown';
import { analyzeImports } from './analyze';
import type { SourceGraph, SourceImport, SourceModule } from './graph';
import { createShadcnRegistryFiles } from './registry';
import type { ShadcnPluginOptions } from './types';

export type { ShadcnPluginOptions } from './types';

/** Emit only Shadcn JSON assets from VJSC modules in a dedicated Rolldown build. */
export function shadcnPlugin<Item extends ComponentMeta>(options: ShadcnPluginOptions<Item>): Plugin {
  const root = resolveModulePath(options.root);
  let graph: SourceGraph<Item> | undefined;

  return {
    name: 'vjsc:shadcn',
    buildStart() {
      graph = undefined;
      for (const item of options.registry.items.shared ?? []) {
        for (const file of item.files) this.addWatchFile(resolve(root, file.source));
      }
    },
    async buildEnd(error) {
      if (error) return;
      const modules: SourceModule<Item>[] = [];

      for (const id of this.getModuleIds()) {
        const fileName = resolveGraphFile(id);
        if (!fileName || !isInsideRoot(root, fileName)) continue;
        const info = this.getModuleInfo(id);
        if (!info) this.error(`Shadcn source is missing from the host graph: ${id}`);
        const input = readVjscInput(info.meta);
        const source = readVjscSource(info.meta);
        if (!input || !source) continue;

        const imports: SourceImport[] = [];
        for (const reference of analyzeImports(source, fileName)) {
          const resolved = await this.resolve(reference.specifier, id);
          const resolvedId = resolved ? (resolveGraphFile(resolved.id) ?? resolved.id) : undefined;
          if (reference.specifier.startsWith('.') && !resolvedId) {
            this.error(`Shadcn source cannot resolve relative import \`${reference.specifier}\` from \`${fileName}\`.`);
          }
          if (reference.specifier.startsWith('.') && resolvedId && !isInsideRoot(root, resolvedId)) {
            this.error(
              `Shadcn relative import \`${reference.specifier}\` from \`${fileName}\` resolves outside the registry source root.`
            );
          }
          imports.push({ ...reference, ...(resolvedId ? { resolvedId } : {}) });
        }
        modules.push({
          id: fileName,
          source,
          meta: maybeExtractComponentMeta(input, fileName) as Item | undefined,
          imports,
        });
      }
      graph = { root, modules: new Map(modules.map((module) => [module.id, module])) };
    },
    async generateBundle(_outputOptions, bundle) {
      if (!graph) this.error('Shadcn source graph was not collected before output generation.');
      for (const fileName of Object.keys(bundle)) delete bundle[fileName];
      for (const file of await createShadcnRegistryFiles(graph, options.registry)) {
        this.emitFile({ type: 'asset', fileName: file.path, source: file.content });
      }
    },
  };
}

function maybeExtractComponentMeta(source: string, fileName: string): ComponentMeta | undefined {
  try {
    return extractComponentMeta(source, fileName);
  } catch (error) {
    if (error instanceof Error && error.message.includes('must export a static')) return undefined;
    throw error;
  }
}

function resolveGraphFile(id: string): string | undefined {
  const clean = cleanId(id);
  if (!isAbsolute(clean)) return undefined;
  return resolveModulePath(clean);
}

function isInsideRoot(root: string, fileName: string): boolean {
  const path = relative(root, fileName);
  return Boolean(path) && path !== '..' && !path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`);
}

function cleanId(id: string): string {
  const queryIndex = id.indexOf('?');
  return queryIndex === -1 ? id : id.slice(0, queryIndex);
}

function resolveModulePath(path: string): string {
  try {
    return realpathSync(resolve(path));
  } catch {
    return resolve(path);
  }
}
