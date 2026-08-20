import { createHash } from 'node:crypto';
import { globSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

import type { OutputBundle, Plugin } from 'rolldown';

import { type ComponentMeta, extractComponentMeta } from '../components/meta';
import { collectImportReferences } from './imports';
import type { ShadcnRegistryDefinition } from './index';
import { createShadcnRegistryFiles, type ShadcnGraph, type ShadcnGraphModule } from './registry';

export interface ShadcnPluginOptions<Item extends ComponentMeta = ComponentMeta> {
  /** Root containing the editable source and shared registry files. */
  readonly root: string;
  /** Complete root-relative inventory of editable source modules. */
  readonly include: string | readonly string[];
  /** Root-relative source module globs to omit. */
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

/** Emit a Shadcn registry from VJSC-transformed modules in the Rolldown graph. */
export function shadcnPlugin<Item extends ComponentMeta>(options: ShadcnPluginOptions<Item>): Plugin {
  const root = canonicalPath(options.root);
  const query = createQuery(options.query);
  const triggerId = `virtual:vjsc/shadcn/${createHash('sha256').update(root).update(query).digest('hex').slice(0, 12)}`;
  const resolvedTriggerId = `\0${triggerId}`;
  const captured = new Map<string, CapturedModule>();
  const resolvedImports = new Map<string, Set<string>>();
  let metadata = new Map<string, Item | undefined>();
  let triggerSource = 'export default null;';
  let graph: ShadcnGraph | undefined;

  return {
    name: 'vjsc:shadcn',
    buildStart() {
      captured.clear();
      resolvedImports.clear();
      graph = undefined;
      metadata = discoverSources(options, root);
      validatePublishedItems(metadata, options.registry);

      this.addWatchFile(root);
      for (const fileName of metadata.keys()) this.addWatchFile(fileName);
      for (const item of options.registry.items.shared ?? []) {
        for (const file of item.files) this.addWatchFile(resolve(root, file.source));
      }

      const entries = [...metadata.keys()].map((fileName) => `${fileName}${query}`);
      triggerSource = `${entries.map((id) => `void import(${JSON.stringify(id)});`).join('\n')}\nexport default null;`;
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
        const imports = resolvedImports.get(fileName) ?? new Set<string>();
        resolvedImports.set(fileName, imports);
        for (const specifier of relativeModuleSpecifiers(code, fileName)) {
          const resolved = await this.resolve(specifier, id);
          if (!resolved)
            this.error(`Shadcn source cannot resolve relative import \`${specifier}\` from \`${fileName}\`.`);
          const importedFile = canonicalPath(cleanId(resolved.id));
          if (!metadata.has(importedFile)) {
            this.error(
              `Shadcn relative import \`${specifier}\` from \`${fileName}\` resolves outside the configured source files.`
            );
          }
          imports.add(importedFile);
        }
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
          meta: metadata.get(fileName),
          importedIds: unique([
            ...info.importedIds.map((id) => canonicalImport(id, metadata)),
            ...info.dynamicallyImportedIds.map((id) => canonicalImport(id, metadata)),
            ...(resolvedImports.get(fileName) ?? []),
          ]),
        });
      }

      for (const [fileName, meta] of metadata) {
        if (!meta || !options.registry.items.published.includes(meta.name)) continue;
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
      removeTriggerChunks(bundle, resolvedTriggerId);
    },
  };
}

function relativeModuleSpecifiers(source: string, fileName: string): string[] {
  return unique(
    collectImportReferences(source, fileName)
      .map((reference) => reference.specifier)
      .filter((specifier) => specifier.startsWith('.'))
  );
}

function canonicalImport(id: string, metadata: ReadonlyMap<string, unknown>): string {
  const canonical = canonicalPath(cleanId(id));
  return metadata.has(canonical) ? canonical : id;
}

function removeTriggerChunks(bundle: OutputBundle, triggerId: string): void {
  const chunks = new Map(
    Object.entries(bundle).filter(
      (entry): entry is [string, Extract<(typeof entry)[1], { type: 'chunk' }>] => entry[1].type === 'chunk'
    )
  );
  const trigger = [...chunks].find(([, chunk]) => chunk.facadeModuleId === triggerId)?.[0];
  if (!trigger) return;

  const candidates = new Set<string>();
  const visit = (fileName: string): void => {
    if (candidates.has(fileName)) return;
    candidates.add(fileName);
    const chunk = chunks.get(fileName);
    for (const dependency of [...(chunk?.imports ?? []), ...(chunk?.dynamicImports ?? [])]) {
      if (chunks.has(dependency)) visit(dependency);
    }
  };
  visit(trigger);

  const retained = new Set<string>();
  for (const fileName of candidates) {
    if (fileName === trigger) continue;
    const chunk = chunks.get(fileName)!;
    if (
      chunk.isEntry ||
      [...chunks].some(
        ([importer, value]) =>
          !candidates.has(importer) && [...value.imports, ...value.dynamicImports].includes(fileName)
      )
    ) {
      retained.add(fileName);
    }
  }
  const retainDependencies = (fileName: string): void => {
    const chunk = chunks.get(fileName);
    for (const dependency of [...(chunk?.imports ?? []), ...(chunk?.dynamicImports ?? [])]) {
      if (!candidates.has(dependency) || retained.has(dependency)) continue;
      retained.add(dependency);
      retainDependencies(dependency);
    }
  };
  for (const fileName of [...retained]) retainDependencies(fileName);
  for (const fileName of candidates) if (!retained.has(fileName)) delete bundle[fileName];
}

function discoverSources<Item extends ComponentMeta>(
  options: ShadcnPluginOptions<Item>,
  root: string
): Map<string, Item | undefined> {
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
  const output = new Map<string, Item | undefined>();
  const names = new Set<string>();

  for (const fileName of files) {
    const meta = maybeExtractComponentMeta(readFileSync(fileName, 'utf8'), fileName) as Item | undefined;
    if (meta && names.has(meta.name)) throw new Error(`Component \`${meta.name}\` is declared more than once.`);
    if (meta) names.add(meta.name);
    output.set(fileName, meta);
  }
  return output;
}

function validatePublishedItems<Item extends ComponentMeta>(
  metadata: ReadonlyMap<string, Item | undefined>,
  registry: ShadcnRegistryDefinition<Item>
): void {
  const available = new Set([...metadata.values()].flatMap((meta) => (meta ? [meta.name] : [])));
  const published = new Set<string>();
  for (const name of registry.items.published) {
    if (published.has(name)) throw new Error(`Shadcn item \`${name}\` is published more than once.`);
    if (!available.has(name)) throw new Error(`Shadcn registry references missing component \`${name}\`.`);
    published.add(name);
  }
}

function maybeExtractComponentMeta(source: string, fileName: string): ComponentMeta | undefined {
  try {
    return extractComponentMeta(source, fileName);
  } catch (error) {
    if (error instanceof Error && error.message.includes('must export a static')) return undefined;
    throw error;
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

function unique(values: Iterable<string>): string[] {
  return [...new Set(values)];
}
