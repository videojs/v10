import { globSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import type { OutputBundle, Plugin, PluginContext } from 'rolldown';

import type { ModuleMeta } from '../components/meta';
import { type GraphModuleInput, finalizeGraph } from '../graph/finalize';
import type { GraphImport, VjscGraph } from '../graph/types';
import { analyzeImports } from '../shadcn/analyze';
import { toArray } from '../utils/array';
import { moduleFilename, moduleId, normalizeResolvedId, parseModuleId } from '../utils/module-id';
import { isInsideRoot } from '../utils/path';
import { readVjscModuleMeta } from './component-meta';
import type { VjscEntriesOptions } from './vjsc';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;
const VIRTUAL_STYLE_ID = /(?:^|\0)virtual:vjsc\/css\//;

export interface VjscGraphCapability<Node extends ModuleMeta = ModuleMeta> {
  readonly api: VjscGraph<Node>;
  clear(): void;
  finalize(graph: VjscGraph<Node>): void;
}

/** Create the stable plugin API object whose properties become available after `buildEnd`. */
export function createVjscGraphCapability<Node extends ModuleMeta>(): VjscGraphCapability<Node> {
  let graph: VjscGraph<Node> | undefined;
  const current = (): VjscGraph<Node> => {
    if (!graph) throw new Error('The VJSC graph is not available before buildEnd.');

    return graph;
  };

  return {
    api: {
      get root() {
        return current().root;
      },
      get modules() {
        return current().modules;
      },
      get assets() {
        return current().assets;
      },
    },
    clear() {
      graph = undefined;
    },
    finalize(value) {
      graph = value;
    },
  };
}

/** Capture selected entries and their finalized transformed dependencies for the `vjscPlugin` API. */
export function vjscGraphPlugin<Node extends ModuleMeta>(
  entriesOptions: VjscEntriesOptions | undefined,
  capability: VjscGraphCapability<Node>
): Plugin {
  let root = resolveModulePath(entriesOptions?.root ?? process.cwd());
  const entries = new Map<string, { readonly filename: string; readonly params: Readonly<Record<string, string>> }>();
  const references = new Set<string>();
  const assets = new Map<string, string>();

  return {
    name: 'vjsc:graph',
    apply: 'build',
    options(options) {
      root = resolveModulePath(resolve(options.cwd ?? process.cwd(), entriesOptions?.root ?? '.'));
      return null;
    },
    buildStart() {
      capability.clear();
      entries.clear();
      references.clear();
      assets.clear();

      const files = entriesOptions ? discoverFiles(root, entriesOptions.include, entriesOptions.exclude) : [];

      for (const filename of files) {
        this.addWatchFile(filename);

        const params = entriesOptions?.resolve?.params({ filename }) ?? [{}];

        for (const selection of params) {
          const id = moduleId(filename, selection);

          if (entries.has(id)) this.error(`VJSC entry is declared twice: \`${id}\`.`);

          entries.set(id, { filename, params: { ...selection } });
          references.add(this.emitFile({ type: 'chunk', id }));
        }
      }
    },
    transform: {
      order: 'pre',
      filter: { id: VIRTUAL_STYLE_ID },
      handler(code, id) {
        assets.set(normalizeGraphId(id), code);
        return null;
      },
    },
    async buildEnd(error) {
      if (error) return;

      const modules: GraphModuleInput<Node>[] = [];

      for (const hostId of this.getModuleIds()) {
        const id = normalizeResolvedId(hostId);

        if (VIRTUAL_STYLE_ID.test(id)) {
          const source = this.getModuleInfo(hostId)?.code;

          if (source !== null && source !== undefined && !assets.has(normalizeGraphId(id))) {
            assets.set(normalizeGraphId(id), source);
          }

          continue;
        }

        if (!SCRIPT_ID.test(id)) continue;

        const parsed = parseModuleId(id);
        if (!isAbsolute(parsed.filename) || !isInsideRoot(root, parsed.filename)) continue;

        if (!entriesOptions && parsed.params.size === 0) continue;

        const entry = entries.get(id) ?? {
          filename: parsed.filename,
          params: Object.fromEntries(parsed.params),
        };
        const info = this.getModuleInfo(hostId);
        const source = info?.code;

        if (source === null || source === undefined) this.error(`VJSC graph has no transformed output for \`${id}\`.`);

        const buildMeta = readVjscModuleMeta(info?.meta);
        const references = analyzeImports(source, entry.filename);
        const imports: GraphImport[] = [];

        for (const reference of references) {
          const resolved = await this.resolve(reference.specifier, id);
          const resolvedId = resolved ? normalizeResolvedId(resolved.id) : undefined;

          if (reference.specifier.startsWith('.') && !resolvedId) {
            this.error(
              `VJSC graph cannot resolve relative import \`${reference.specifier}\` from \`${entry.filename}\`.`
            );
          }

          if (
            reference.specifier.startsWith('.') &&
            resolvedId &&
            isAbsolute(moduleFilename(resolvedId)) &&
            !isInsideRoot(root, moduleFilename(resolvedId))
          ) {
            this.error(
              `VJSC graph relative import \`${reference.specifier}\` from \`${entry.filename}\` resolves outside the graph root.`
            );
          }

          imports.push({ ...reference, ...(resolvedId ? { resolvedId } : {}) });
        }

        modules.push({
          id,
          ...entry,
          source,
          imports,
          styles: buildMeta?.moduleStyles ?? { files: [], assets: [] },
          ...(buildMeta?.moduleMeta ? { meta: buildMeta.moduleMeta as unknown as Node } : {}),
        });
      }

      capability.finalize(finalizeGraph(root, modules, assets));
    },
    generateBundle(_options, bundle) {
      removeEntryChunks(this, bundle, references);
    },
  } as Plugin & { readonly apply: 'build' };
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

function normalizeGraphId(id: string): string {
  const normalized = normalizeResolvedId(id);

  return normalized.startsWith('\0') ? normalized.slice(1) : normalized;
}

function removeEntryChunks(context: PluginContext, bundle: OutputBundle, references: ReadonlySet<string>): void {
  const entryChunks = new Set([...references].map((reference) => context.getFileName(reference)));
  const owned = collectChunkDependencies(bundle, entryChunks);
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

function resolveModulePath(path: string): string {
  try {
    return realpathSync(resolve(path));
  } catch {
    return resolve(path);
  }
}
