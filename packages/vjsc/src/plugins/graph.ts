import { globSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import type { OutputBundle, Plugin, PluginContext } from 'rolldown';

import type { ModuleMeta } from '../components/meta';
import { type GraphModuleInput, finalizeGraph } from '../graph/finalize';
import type { GraphImport, Graph } from '../graph/types';
import { analyzeImports } from '../shadcn/analyze';
import { toArray } from '../utils/array';
import { moduleFilename, moduleId, normalizeResolvedId, parseModuleId, SCRIPT_MODULE_ID } from '../utils/module-id';
import { isInsideRoot } from '../utils/path';
import { readModuleBuildMeta } from './component-meta';
import type { EntriesOptions } from './vjsc';

const VIRTUAL_STYLE_ID = /(?:^|\0)virtual:vjsc\/css\//;

export interface GraphCapability<Node extends ModuleMeta = ModuleMeta> {
  readonly api: Graph<Node>;
  clear(): void;
  finalize(graph: Graph<Node>): void;
}

/** Create the stable plugin API object whose properties become available after `buildEnd`. */
export function createGraphCapability<Node extends ModuleMeta>(): GraphCapability<Node> {
  let graph: Graph<Node> | undefined;
  const current = (): Graph<Node> => {
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
export function graphPlugin<Node extends ModuleMeta>(
  entriesOptions: EntriesOptions | undefined,
  capability: GraphCapability<Node>
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

      const candidates: string[] = [];

      for (const hostId of this.getModuleIds()) {
        const id = normalizeResolvedId(hostId);

        if (VIRTUAL_STYLE_ID.test(id)) {
          const source = this.getModuleInfo(hostId)?.code;

          if (source !== null && source !== undefined && !assets.has(normalizeGraphId(id))) {
            assets.set(normalizeGraphId(id), source);
          }

          continue;
        }

        if (!SCRIPT_MODULE_ID.test(id)) continue;

        const parsed = parseModuleId(id);
        if (!isAbsolute(parsed.filename) || !isInsideRoot(root, parsed.filename)) continue;

        if (!entriesOptions && parsed.params.size === 0) continue;

        candidates.push(hostId);
      }

      const modules = await Promise.all(
        candidates.map(async (hostId): Promise<GraphModuleInput<Node>> => {
          const id = normalizeResolvedId(hostId);
          const parsed = parseModuleId(id);
          const entry = entries.get(id) ?? {
            filename: parsed.filename,
            params: Object.fromEntries(parsed.params),
          };
          const info = this.getModuleInfo(hostId);
          const source = info?.code;

          if (source === null || source === undefined) {
            this.error(`VJSC graph has no transformed output for \`${id}\`.`);
          }

          const references = analyzeImports(source, entry.filename);
          const buildMeta = readModuleBuildMeta(info?.meta);
          const styles = importedModuleStyles(references);
          const imports = await Promise.all(
            references.map(async (reference): Promise<GraphImport> => {
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

              return { ...reference, ...(resolvedId ? { resolvedId } : {}) };
            })
          );

          return {
            id,
            ...entry,
            source,
            imports,
            styles,
            ...(buildMeta?.moduleMeta ? { meta: buildMeta.moduleMeta as unknown as Node } : {}),
            ...(buildMeta?.metaRemoved ? { metaRemoved: true } : {}),
          };
        })
      );

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

/** Read exact generated stylesheet ownership from the final transformed imports. */
function importedModuleStyles(references: readonly GraphImport[]): GraphModuleInput['styles'] {
  const assets = references
    .map(({ specifier }) => normalizeGraphId(specifier))
    .filter((specifier) => specifier.startsWith('virtual:vjsc/css/'));
  const files = assets
    .map((asset) => decodeURIComponent(asset.slice(asset.lastIndexOf('/') + 1)))
    .filter((file) => file !== 'base.css');

  return {
    files: [...new Set(files)].sort(),
    // Keep import order: bundled styles rely on it so composed overrides follow the rules they extend.
    assets: [...new Set(assets)],
  };
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
