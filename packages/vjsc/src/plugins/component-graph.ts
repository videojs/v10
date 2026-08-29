import { globSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import type { OutputBundle, Plugin, PluginContext } from 'rolldown';

import type { ComponentMeta } from '../components/meta';
import type {
  ComponentGraph,
  ComponentGraphImport,
  ComponentGraphInput,
  ComponentGraphModule,
  ComponentGraphPluginApi,
  ComponentGraphPluginOptions,
} from '../graph';
import { analyzeImports } from '../shadcn/analyze';
import { toArray } from '../utils/array';
import { moduleFilename, moduleId, normalizeResolvedId, parseModuleId } from '../utils/module-id';
import { isInsideRoot } from '../utils/path';
import { readComponentMeta, readComponentStyles } from './component-meta';

export type { ComponentGraphPluginOptions } from '../graph';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;
const VIRTUAL_STYLE_ID = /(?:^|\0)virtual:vjsc\/css\//;

/** Capture final VJSC modules, imports, styles, and assets for downstream build adapters. */
export function componentGraphPlugin<Item extends ComponentMeta>(
  options: ComponentGraphPluginOptions
): Plugin<ComponentGraphPluginApi<Item>> {
  const root = resolveModulePath(options.root);
  const entries = new Map<string, ComponentGraphInput>();
  const references = new Set<string>();
  const assets = new Map<string, string>();
  let graph: ComponentGraph<Item> | undefined;

  const plugin: Plugin<ComponentGraphPluginApi<Item>> = {
    name: 'vjsc:component-graph',
    api: {
      getGraph() {
        if (!graph) throw new Error('The VJSC component graph is not available before buildEnd.');

        return graph;
      },
    },
    buildStart() {
      graph = undefined;
      entries.clear();
      references.clear();
      assets.clear();

      const files = discoverFiles(root, options.include, options.exclude);
      const discovered = files.map((filename): ComponentGraphInput => ({ id: filename, filename, transform: {} }));

      this.addWatchFile(root);

      for (const filename of files) this.addWatchFile(filename);

      for (const module of discovered) {
        const transformations = options.transformations?.(module, discovered) ?? [{}];

        for (const transform of transformations) {
          const id = moduleId(module.filename, transform);

          if (entries.has(id)) this.error(`Component graph transformation is declared twice: \`${id}\`.`);

          entries.set(id, { ...module, id, transform: { ...transform } });
          references.add(this.emitFile({ type: 'chunk', id }));
        }
      }
    },
    async resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return null;

      const selection = parseModuleId(importer);
      if ([...selection.parameters].length === 0) return null;

      const resolved = await this.resolve(source, selection.filename, { skipSelf: true });
      if (!resolved || resolved.external) return resolved;

      const filename = moduleFilename(normalizeResolvedId(resolved.id));
      if (!isAbsolute(filename) || !SCRIPT_ID.test(filename) || !isInsideRoot(root, filename)) return resolved;

      return { ...resolved, id: moduleId(filename, selection.parameters) };
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

      const modules: ComponentGraphModule<Item>[] = [];
      const styles = new Map<string, readonly string[]>();

      for (const hostId of this.getModuleIds()) {
        const id = normalizeResolvedId(hostId);
        if (!SCRIPT_ID.test(id)) continue;

        const parsed = parseModuleId(id);
        if (!isAbsolute(parsed.filename) || !isInsideRoot(root, parsed.filename)) continue;

        const entry = entries.get(id) ?? {
          id,
          filename: parsed.filename,
          transform: Object.fromEntries(parsed.parameters),
        };
        const info = this.getModuleInfo(hostId);
        const source = info?.code;

        if (source === null || source === undefined)
          this.error(`Component graph has no transformed output for \`${id}\`.`);

        const meta = readComponentMeta(info?.meta) as Item | undefined;
        const styleIds = readComponentStyles(info?.meta).map(normalizeGraphId);
        const imports: ComponentGraphImport[] = [];

        if (styleIds.length > 0) styles.set(id, styleIds);

        for (const reference of analyzeImports(source, entry.filename)) {
          const resolved = await this.resolve(reference.specifier, id);
          const resolvedId = resolved ? normalizeResolvedId(resolved.id) : undefined;

          if (reference.specifier.startsWith('.') && !resolvedId) {
            this.error(
              `Component graph cannot resolve relative import \`${reference.specifier}\` from \`${entry.filename}\`.`
            );
          }

          if (
            reference.specifier.startsWith('.') &&
            resolvedId &&
            isAbsolute(moduleFilename(resolvedId)) &&
            !isInsideRoot(root, moduleFilename(resolvedId))
          ) {
            this.error(
              `Component graph relative import \`${reference.specifier}\` from \`${entry.filename}\` resolves outside the graph root.`
            );
          }

          imports.push({ ...reference, ...(resolvedId ? { resolvedId } : {}) });
        }

        modules.push({ ...entry, id, ...(meta ? { meta } : {}), source, imports });
      }

      graph = {
        root,
        modules: new Map(modules.map((module) => [module.id, module])),
        assets: new Map(assets),
        styles,
      };
    },
    generateBundle(_options, bundle) {
      removeEntryChunks(this, bundle, references);
    },
  };

  return plugin;
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
