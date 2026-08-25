import { globSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

import type { OutputBundle, Plugin, PluginContext } from 'rolldown';

import type { ComponentMeta } from '../components/meta';
import { analyzeImports } from '../shadcn/analyze';
import type { SourceGraph, SourceImport, SourceModule } from '../shadcn/graph';
import { createShadcnRegistryFiles } from '../shadcn/registry';
import type { ShadcnModule, ShadcnPluginOptions } from '../shadcn/types';
import { toArray } from '../utils/array';
import { moduleFilename, moduleId, normalizeResolvedId } from '../utils/module-id';
import { isInsideRoot } from '../utils/path';
import { readComponentMeta, readComponentSource } from './component-meta';
import { componentSourcePlugin } from './component-source';

export type { ShadcnPluginOptions } from '../shadcn/types';

/** Discover component sources, capture their transformed graphs, and emit Shadcn JSON assets. */
export function shadcnPlugin<Item extends ComponentMeta>(options: ShadcnPluginOptions<Item>): Plugin[] {
  return [componentSourcePlugin(), shadcnEmitterPlugin(options)];
}

function shadcnEmitterPlugin<Item extends ComponentMeta>(options: ShadcnPluginOptions<Item>): Plugin {
  const root = resolveModulePath(options.root);
  const sources = new Map<string, ShadcnModule<Item>>();
  const sourceEntries = new Set<string>();
  let graph: SourceGraph<Item> | undefined;

  return {
    name: 'vjsc:shadcn',
    buildStart() {
      graph = undefined;
      sources.clear();
      sourceEntries.clear();

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
        })
      );

      for (const module of discovered) {
        const transformations = options.publish.modules?.(module, discovered) ?? [{}];

        for (const transform of transformations) {
          const id = moduleId(module.filename, transform);

          if (sources.has(id)) this.error(`Shadcn source transformation is declared twice: \`${id}\`.`);

          sources.set(id, { ...module, id, transform: { ...transform } });
          sourceEntries.add(this.emitFile({ type: 'chunk', id }));
        }
      }
    },
    async buildEnd(error) {
      if (error) return;

      const modules: SourceModule<Item>[] = [];

      for (const module of sources.values()) {
        const info = this.getModuleInfo(module.id);
        const source = readComponentSource(info?.meta);

        if (source === undefined) this.error(`Shadcn source has no captured component output: \`${module.id}\`.`);

        const meta = readComponentMeta(info?.meta) as Item | undefined;
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

        modules.push({ ...module, ...(meta ? { meta } : {}), source, imports });
      }

      graph = { root, modules: new Map(modules.map((module) => [module.id, module])) };
    },
    async generateBundle(_outputOptions, bundle) {
      if (!graph) this.error('Shadcn source graph was not collected before output generation.');

      removeSourceEntryChunks(this, bundle, sourceEntries);

      for (const file of await createShadcnRegistryFiles(graph, options)) {
        this.emitFile({ type: 'asset', fileName: file.path, source: file.content });
      }
    },
  };
}

function removeSourceEntryChunks(context: PluginContext, bundle: OutputBundle, references: ReadonlySet<string>): void {
  const sourceChunks = new Set([...references].map((reference) => context.getFileName(reference)));
  const owned = collectChunkDependencies(bundle, sourceChunks);
  const retainedRoots = Object.values(bundle).flatMap((output) =>
    output.type === 'chunk' && !owned.has(output.fileName) ? [output.fileName] : []
  );
  const retained = collectChunkDependencies(bundle, retainedRoots);

  for (const fileName of owned) {
    if (!retained.has(fileName)) delete bundle[fileName];
  }
}

function collectChunkDependencies(bundle: OutputBundle, roots: Iterable<string>): Set<string> {
  const collected = new Set<string>();
  const visit = (fileName: string): void => {
    if (collected.has(fileName)) return;

    const output = bundle[fileName];
    if (output?.type !== 'chunk') return;

    collected.add(fileName);

    for (const dependency of [...output.imports, ...output.dynamicImports]) visit(dependency);
  };

  for (const root of roots) visit(root);

  return collected;
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

function resolveModulePath(path: string): string {
  try {
    return realpathSync(resolve(path));
  } catch {
    return resolve(path);
  }
}
