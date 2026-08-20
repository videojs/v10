import { globSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

import type { Plugin } from 'rolldown';

import { type ComponentMeta, extractComponentMeta } from '../components/meta';
import { analyzeImports } from './analyze';
import type { SourceGraph, SourceImport, SourceModule } from './graph';
import { createShadcnRegistryFiles } from './registry';
import type { ShadcnPluginOptions, ShadcnVariant } from './types';

export type { ShadcnPluginOptions } from './types';

/** Discover editable sources, capture their VJSC projections, and emit Shadcn JSON assets. */
export function shadcnPlugin<Item extends ComponentMeta>(options: ShadcnPluginOptions<Item>): Plugin {
  const root = resolveModulePath(options.root);
  const planned = new Map<string, PlannedModule<Item>>();
  const captured = new Map<string, SourceModule<Item>>();
  let graph: SourceGraph<Item> | undefined;

  return {
    name: 'vjsc:shadcn',
    buildStart() {
      graph = undefined;
      planned.clear();
      captured.clear();

      const files = discoverFiles(root, options.include, options.exclude);
      this.addWatchFile(root);
      for (const filename of files) this.addWatchFile(filename);
      if (options.styles) {
        for (const filename of discoverStyleFiles(resolve(root, options.styles.input))) this.addWatchFile(filename);
      }
      const variants = (options.variants ?? []).map((variant) => ({
        variant,
        files: new Set(discoverFiles(root, variant.include, variant.exclude)),
      }));

      for (const filename of files) {
        const meta = maybeExtractComponentMeta(readFileSync(filename, 'utf8'), filename) as Item | undefined;
        const matched = variants.filter((variant) => variant.files.has(filename));
        const projections = matched.length > 0 ? matched : [{ variant: undefined, files: undefined }];

        for (const projection of projections) {
          const id = moduleId(filename, projection.variant?.parameters);
          if (planned.has(id)) this.error(`Shadcn source projection is declared twice: \`${id}\`.`);
          planned.set(id, { id, filename, meta, variant: projection.variant });
          this.emitFile({ type: 'chunk', id });
        }
      }
    },
    transform(code, id) {
      const normalizedId = normalizeModuleId(id);
      const module = planned.get(normalizedId);
      if (!module) return null;
      captured.set(normalizedId, { ...module, id: normalizedId, source: code, imports: [] });
      return null;
    },
    async buildEnd(error) {
      if (error) return;
      const modules: SourceModule<Item>[] = [];

      for (const capturedModule of captured.values()) {
        const source = capturedModule.source;
        const imports: SourceImport[] = [];
        for (const reference of analyzeImports(source, capturedModule.filename)) {
          const resolved = await this.resolve(reference.specifier, capturedModule.id);
          const resolvedId = resolved ? normalizeResolvedId(resolved.id) : undefined;
          if (reference.specifier.startsWith('.') && !resolvedId) {
            this.error(
              `Shadcn source cannot resolve relative import \`${reference.specifier}\` from \`${capturedModule.filename}\`.`
            );
          }
          if (
            reference.specifier.startsWith('.') &&
            resolvedId &&
            isAbsolute(cleanId(resolvedId)) &&
            !isInsideRoot(root, cleanId(resolvedId))
          ) {
            this.error(
              `Shadcn relative import \`${reference.specifier}\` from \`${capturedModule.filename}\` resolves outside the registry source root.`
            );
          }
          imports.push({ ...reference, ...(resolvedId ? { resolvedId } : {}) });
        }
        modules.push({ ...capturedModule, source, imports });
      }

      if (captured.size !== planned.size) {
        const missing = [...planned.keys()].filter((id) => !captured.has(id));
        this.error(
          `Shadcn source was not transformed by the host graph: ${missing.map((id) => `\`${id}\``).join(', ')}.`
        );
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

interface PlannedModule<Item extends ComponentMeta> {
  readonly id: string;
  readonly filename: string;
  readonly meta?: Item | undefined;
  readonly variant?: ShadcnVariant | undefined;
}

function discoverFiles(
  root: string,
  include: string | readonly string[],
  exclude?: string | readonly string[]
): string[] {
  const patterns = typeof include === 'string' ? [include] : include;
  const excluded = typeof exclude === 'string' ? [exclude] : exclude;
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

function moduleId(filename: string, parameters?: Readonly<Record<string, string>>): string {
  if (!parameters || Object.keys(parameters).length === 0) return filename;
  const query = new URLSearchParams(
    Object.entries(parameters).sort(([left], [right]) => left.localeCompare(right))
  ).toString();
  return `${filename}?${query}`;
}

function normalizeModuleId(id: string): string {
  const queryIndex = id.indexOf('?');
  const filename = resolveModulePath(queryIndex === -1 ? id : id.slice(0, queryIndex));
  if (queryIndex === -1) return filename;
  const parameters = Object.fromEntries(new URLSearchParams(id.slice(queryIndex + 1)));
  return moduleId(filename, parameters);
}

function normalizeResolvedId(id: string): string {
  return isAbsolute(cleanId(id)) ? normalizeModuleId(id) : id;
}

function isInsideRoot(root: string, filename: string): boolean {
  const path = relative(root, filename);
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
