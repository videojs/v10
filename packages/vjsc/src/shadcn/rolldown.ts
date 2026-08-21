import { globSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import { type ComponentMeta, extractComponentMeta } from '../components/meta';
import { toArray } from '../utils/array';
import { moduleFilename, moduleId, normalizeModuleId, normalizeResolvedId } from '../utils/module-id';
import { isInsideRoot } from '../utils/path';
import { analyzeImports } from './analyze';
import type { SourceGraph, SourceImport, SourceModule } from './graph';
import { createShadcnRegistryFiles } from './registry';
import type { ShadcnModule, ShadcnPluginOptions } from './types';

export type { ShadcnPluginOptions } from './types';

/** Discover editable sources, capture their VJSC transformations, and emit Shadcn JSON assets. */
export function shadcnPlugin<Item extends ComponentMeta>(options: ShadcnPluginOptions<Item>): Plugin {
  const root = resolveModulePath(options.root);
  const sources = new Map<string, SourceState<Item>>();
  let graph: SourceGraph<Item> | undefined;

  return {
    name: 'vjsc:shadcn',
    buildStart() {
      graph = undefined;
      sources.clear();

      const files = discoverFiles(root, options.include, options.exclude);
      this.addWatchFile(root);
      for (const filename of files) this.addWatchFile(filename);
      if (options.styles) {
        for (const filename of discoverStyleFiles(resolve(root, options.styles.input))) this.addWatchFile(filename);
      }
      const discovered = files.map(
        (filename): ShadcnModule<Item> => ({
          id: filename,
          filename,
          transform: {},
          meta: maybeExtractComponentMeta(readFileSync(filename, 'utf8'), filename) as Item | undefined,
        })
      );

      for (const module of discovered) {
        const transformations = options.publish.modules?.(module, discovered) ?? [{}];
        for (const transform of transformations) {
          const id = moduleId(module.filename, transform);
          if (sources.has(id)) this.error(`Shadcn source transformation is declared twice: \`${id}\`.`);
          sources.set(id, { ...module, id, transform: { ...transform } });
          this.emitFile({ type: 'chunk', id });
        }
      }
    },
    transform(code, id) {
      const normalizedId = normalizeModuleId(id);
      const module = sources.get(normalizedId);
      if (!module) return null;
      module.source = code;
      return null;
    },
    async buildEnd(error) {
      if (error) return;
      const modules: SourceModule<Item>[] = [];

      for (const module of sources.values()) {
        const source = module.source;
        if (source === undefined) {
          this.error(`Shadcn source was not transformed by the host graph: \`${module.id}\`.`);
        }
        const imports: SourceImport[] = [];
        for (const reference of analyzeImports(source, module.filename)) {
          const resolved = await this.resolve(reference.specifier, module.id);
          const resolvedId = resolved ? normalizeResolvedId(resolved.id) : undefined;
          if (reference.specifier.startsWith('.') && !resolvedId) {
            this.error(
              `Shadcn source cannot resolve relative import \`${reference.specifier}\` from \`${module.filename}\`.`
            );
          }
          if (
            reference.specifier.startsWith('.') &&
            resolvedId &&
            isAbsolute(moduleFilename(resolvedId)) &&
            !isInsideRoot(root, moduleFilename(resolvedId))
          ) {
            this.error(
              `Shadcn relative import \`${reference.specifier}\` from \`${module.filename}\` resolves outside the registry source root.`
            );
          }
          imports.push({ ...reference, ...(resolvedId ? { resolvedId } : {}) });
        }
        modules.push({ ...module, source, imports });
      }
      graph = { root, modules: new Map(modules.map((module) => [module.id, module])) };
    },
    async generateBundle(_outputOptions, bundle) {
      if (!graph) this.error('Shadcn source graph was not collected before output generation.');
      for (const fileName of Object.keys(bundle)) delete bundle[fileName];
      for (const file of await createShadcnRegistryFiles(graph, options)) {
        this.emitFile({ type: 'asset', fileName: file.path, source: file.content });
      }
    },
  };
}

interface SourceState<Item extends ComponentMeta> extends ShadcnModule<Item> {
  source?: string | undefined;
}

function discoverFiles(
  root: string,
  include: string | readonly string[],
  exclude?: string | readonly string[]
): string[] {
  const patterns = toArray(include);
  const excluded = exclude ? toArray(exclude) : undefined;
  return [
    ...new Set(
      patterns.flatMap((pattern) =>
        globSync(pattern, { cwd: root, ...(excluded ? { exclude: excluded } : {}) }).map((filename) =>
          resolveModulePath(resolve(root, filename))
        )
      )
    ),
  ].sort();
}

function discoverStyleFiles(input: string): string[] {
  const files = new Set<string>();
  const visit = (filename: string): void => {
    const resolved = resolveModulePath(filename);
    if (files.has(resolved)) return;
    files.add(resolved);
    const source = readFileSync(resolved, 'utf8');
    for (const match of source.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']/g)) {
      if (match[1]?.startsWith('.')) visit(resolve(dirname(resolved), match[1]));
    }
  };
  visit(input);
  return [...files].sort();
}

function maybeExtractComponentMeta(source: string, filename: string): ComponentMeta | undefined {
  try {
    return extractComponentMeta(source, filename);
  } catch (error) {
    if (error instanceof Error && error.message.includes('must export a static')) return undefined;
    throw error;
  }
}

function resolveModulePath(path: string): string {
  try {
    return realpathSync(resolve(path));
  } catch {
    return resolve(path);
  }
}
