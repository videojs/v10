import { createHash } from 'node:crypto';
import { globSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import { type ComponentMeta, extractComponentMeta } from '../components/meta';
import type { ShadcnRegistryDefinition } from '../shadcn';
import { createShadcnRegistryFiles, type ShadcnGraph, type ShadcnGraphModule } from '../shadcn/registry';

export interface ShadcnPluginOptions<Item extends ComponentMeta = ComponentMeta> {
  /** Root containing the editable source and shared registry files. */
  readonly root: string;
  /** Root-relative component module globs. */
  readonly include: string | readonly string[];
  /** Root-relative component module globs to omit. */
  readonly exclude?: string | readonly string[] | undefined;
  /** VJSC projection requested through the host module graph. */
  readonly query: Readonly<Record<string, string>>;
  /** Shadcn publication policy. */
  readonly registry: ShadcnRegistryDefinition<Item>;
}

interface CapturedModule {
  readonly id: string;
  readonly source: string;
}

/** Shared implementation used by the public Vite and Rolldown adapters. */
export function createShadcnPlugin<Item extends ComponentMeta>(options: ShadcnPluginOptions<Item>): Plugin {
  const root = canonicalPath(options.root);
  const query = createQuery(options.query);
  const triggerId = `virtual:vjsc/shadcn/${createHash('sha256').update(root).update(query).digest('hex').slice(0, 12)}`;
  const resolvedTriggerId = `\0${triggerId}`;
  const captured = new Map<string, CapturedModule>();
  let metadata = new Map<string, Item>();
  let triggerSource = 'export default null;';
  let graph: ShadcnGraph | undefined;

  return {
    name: 'vjsc:shadcn',
    buildStart() {
      captured.clear();
      graph = undefined;
      metadata = discoverMetadata(options, root);
      validatePublishedItems(metadata, options.registry);

      this.addWatchFile(root);
      for (const fileName of metadata.keys()) this.addWatchFile(fileName);
      for (const item of options.registry.items.shared ?? []) {
        for (const file of item.files) this.addWatchFile(resolve(root, file.source));
      }

      const published = new Set(options.registry.items.published);
      const entries = [...metadata]
        .filter(([, meta]) => published.has(meta.name))
        .map(([fileName]) => `${fileName}${query}`);
      triggerSource = `${entries.map((id) => `import ${JSON.stringify(id)};`).join('\n')}\nexport default null;`;
      this.emitFile({ type: 'chunk', id: triggerId });
    },
    resolveId: {
      filter: { id: new RegExp(`^${escapeRegExp(triggerId)}$`) },
      handler(id) {
        return id === triggerId ? resolvedTriggerId : null;
      },
    },
    load: {
      filter: { id: new RegExp(`^${escapeRegExp(resolvedTriggerId)}$`) },
      handler(id) {
        return id === resolvedTriggerId ? triggerSource : null;
      },
    },
    transform: {
      order: 'pre',
      async handler(code, id) {
        if (!id.endsWith(query)) return null;
        const fileName = canonicalPath(cleanId(id));
        if (!metadata.has(fileName)) return null;

        if (hasComponentMeta(code, fileName)) {
          this.error(
            `Shadcn source ${fileName} still exports component metadata. Place shadcnPlugin after vjscPlugin and enable componentMetaPlugin().`
          );
        }
        captured.set(fileName, { id, source: code });
        return null;
      },
    },
    buildEnd(error) {
      if (error) return;
      const modules: ShadcnGraphModule[] = [];

      for (const [fileName, capture] of captured) {
        const info = this.getModuleInfo(capture.id);
        if (!info) this.error(`Shadcn source is missing from the host graph: ${capture.id}`);
        modules.push({
          id: fileName,
          source: capture.source,
          meta: metadata.get(fileName)!,
          importedIds: info.importedIds.map((id) => {
            const canonical = canonicalPath(cleanId(id));
            return metadata.has(canonical) ? canonical : id;
          }),
        });
      }

      for (const [fileName, meta] of metadata) {
        if (!options.registry.items.published.includes(meta.name)) continue;
        if (!captured.has(fileName))
          this.error(`Shadcn published item \`${meta.name}\` was not loaded by the host graph.`);
      }
      graph = { root, modules: new Map(modules.map((module) => [module.id, module])) };
    },
    async generateBundle(_outputOptions, bundle) {
      if (!graph) this.error('Shadcn source graph was not collected before output generation.');
      for (const file of await createShadcnRegistryFiles(graph, options.registry)) {
        this.emitFile({ type: 'asset', fileName: file.path, source: file.content });
      }
      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type === 'chunk' && item.facadeModuleId === resolvedTriggerId) delete bundle[fileName];
      }
    },
  };
}

function discoverMetadata<Item extends ComponentMeta>(
  options: ShadcnPluginOptions<Item>,
  root: string
): Map<string, Item> {
  const include = typeof options.include === 'string' ? [options.include] : options.include;
  const exclude = typeof options.exclude === 'string' ? [options.exclude] : options.exclude;
  const files = [
    ...new Set(
      include.flatMap((pattern) =>
        globSync(pattern, { cwd: root, ...(exclude ? { exclude } : {}) }).map((fileName) =>
          canonicalPath(resolve(root, fileName))
        )
      )
    ),
  ].sort();
  const output = new Map<string, Item>();
  const names = new Set<string>();

  for (const fileName of files) {
    const meta = extractComponentMeta(readFileSync(fileName, 'utf8'), fileName) as Item;
    if (names.has(meta.name)) throw new Error(`Component \`${meta.name}\` is declared more than once.`);
    names.add(meta.name);
    output.set(fileName, meta);
  }
  return output;
}

function validatePublishedItems<Item extends ComponentMeta>(
  metadata: ReadonlyMap<string, Item>,
  registry: ShadcnRegistryDefinition<Item>
): void {
  const available = new Set([...metadata.values()].map((meta) => meta.name));
  const published = new Set<string>();
  for (const name of registry.items.published) {
    if (published.has(name)) throw new Error(`Shadcn item \`${name}\` is published more than once.`);
    if (!available.has(name)) throw new Error(`Shadcn registry references missing component \`${name}\`.`);
    published.add(name);
  }
}

function hasComponentMeta(source: string, fileName: string): boolean {
  try {
    extractComponentMeta(source, fileName);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('must export a static')) return false;
    throw error;
  }
}

function createQuery(query: Readonly<Record<string, string>>): string {
  const parameters = new URLSearchParams(Object.entries(query).sort(([left], [right]) => left.localeCompare(right)));
  return `?${parameters}`;
}

function cleanId(id: string): string {
  const queryIndex = id.indexOf('?');
  return queryIndex === -1 ? id : id.slice(0, queryIndex);
}

function canonicalPath(path: string): string {
  try {
    return realpathSync(resolve(path));
  } catch {
    return resolve(path);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
