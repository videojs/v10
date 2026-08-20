import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { GeneralHookFilter, Plugin, RolldownLog } from 'rolldown';

import type { CompilerDiagnostic, CompilerPlugin, CompilerSourceMap, CompilerTarget } from '../config';
import { type ComponentRegistry, plugin as registryPlugin } from '../registry';
import { HTML_RUNTIME, HTML_RUNTIME_ID, HTML_RUNTIME_IMPORT } from '../targets/html';
import { CompilerError, transform } from '../transform';
import { createGeneratedModuleDeclaration } from './declaration';
import { createBundleModules, type VirtualModuleDefinition } from './modules';
import type { VjscModule, VjscOutputAdapter } from './source';

export interface VjscDeclarationOutput {
  readonly id: VirtualModuleDefinition['id'];
  /** Source identity used to resolve generated declaration imports. */
  readonly sourceFileName: string;
  /** Declaration asset path relative to the bundler output directory. */
  readonly fileName: `${string}.d.ts`;
}

export interface VjscPluginOptions {
  /** Source modules transformed by VJSC. Defaults to TSX files. */
  readonly include?: GeneralHookFilter | undefined;
  readonly exclude?: GeneralHookFilter | undefined;
  /** Default transformation applied to included source modules without a projection query. */
  readonly transform?: VjscTransformConfig | undefined;
  /** Named transformations selected by the `framework` module query parameter. */
  readonly projections?: Readonly<Record<string, VjscProjection>> | undefined;
  /** Directory used to resolve relative transform configuration. */
  readonly cwd?: string | undefined;
  /** Generated modules served without materializing their source. */
  readonly modules?: readonly VirtualModuleDefinition[] | undefined;
  /** Map public virtual IDs to filesystem-shaped IDs for downstream transforms. */
  readonly resolveModuleId?: ((id: VirtualModuleDefinition['id']) => string) | undefined;
  /** Declaration assets emitted from generated modules during a build. */
  readonly declarations?: readonly VjscDeclarationOutput[] | undefined;
  /** Build-only asset projections activated through their virtual entry modules. */
  readonly outputs?: readonly VjscOutputAdapter[] | undefined;
}

export interface VjscTransformConfig {
  readonly target?: CompilerTarget | undefined;
  readonly registry?: ComponentRegistry | undefined;
  readonly plugins?: readonly CompilerPlugin[] | undefined;
}

export interface VjscProjectionContext {
  readonly id: string;
  readonly name: string;
  readonly parameters: URLSearchParams;
}

export type VjscProjection =
  | VjscTransformConfig
  | ((context: VjscProjectionContext) => VjscTransformConfig | Promise<VjscTransformConfig>);

interface HotModuleNode {
  readonly id: string | null;
}

interface HotUpdatePlugin {
  hotUpdate(
    this: {
      environment: {
        moduleGraph: {
          getModuleById(id: string): HotModuleNode | undefined;
          invalidateModule(module: HotModuleNode): void;
        };
      };
    },
    options: { file: string; modules: HotModuleNode[] }
  ): HotModuleNode[] | void;
}

/** Apply VJSC transforms and generated modules through any Rolldown-compatible host. */
export function vjscPlugin(options: VjscPluginOptions = {}): Plugin {
  const cwd = resolve(options.cwd ?? process.cwd());
  const outputs = options.outputs ?? [];
  const cssById = new Map<string, string>();
  const cssIdsByOwner = new Map<string, Set<string>>();
  const watchFilesByModule = new Map<string, Set<string>>();
  const modulesByWatchFile = new Map<string, Set<string>>();
  const modules = createBundleModules({
    modules: [
      ...(options.modules ?? []),
      ...outputs.map((output) => ({
        id: output.moduleId,
        load: () => ({ code: 'export default null;', watchFiles: [] }),
      })),
    ],
    resolveId: options.resolveModuleId ?? resolvedVirtualModuleId,
  });

  const plugin: Plugin & HotUpdatePlugin = {
    name: 'vjsc',
    resolveId: {
      order: 'pre',
      async handler(id, importer, resolveOptions) {
        if (id === HTML_RUNTIME_IMPORT || id === `${HTML_RUNTIME_IMPORT.replace('/jsx-runtime', '')}/jsx-dev-runtime`) {
          return HTML_RUNTIME_ID;
        }
        if (cssById.has(id)) return `\0${id}`;
        const generatedId = modules.resolveId(id);
        if (generatedId) return generatedId;

        const projection = parseProjectionId(id, options.projections);
        const inherited = importer ? parseProjectionId(importer, options.projections) : null;
        if (!projection && (!inherited || !id.startsWith('.'))) return null;

        const resolved = await this.resolve(projection?.id ?? id, importer ? cleanId(importer) : undefined, {
          ...resolveOptions,
          skipSelf: true,
        });
        if (!resolved || resolved.external || !cleanId(resolved.id).endsWith('.tsx')) return resolved;

        return {
          ...resolved,
          id: withParameters(cleanId(resolved.id), projection?.parameters ?? inherited!.parameters),
        };
      },
    },
    async load(id) {
      if (id === HTML_RUNTIME_ID) return { code: HTML_RUNTIME, moduleType: 'js' };

      const projection = parseProjectionId(id, options.projections);
      if (projection) {
        this.addWatchFile(projection.id);
        return { code: await readFile(projection.id, 'utf8'), moduleType: 'tsx' };
      }

      const publicId = id.startsWith('\0') ? id.slice(1) : modules.publicId(id);
      if (!publicId) return null;
      const css = cssById.get(publicId);
      if (css !== undefined) return css;

      const generated = await modules.load(id);
      if (!generated) return null;
      addWatchFiles(this, generated);
      updateModuleWatchFiles(id, generated.watchFiles, watchFilesByModule, modulesByWatchFile);
      return generated.code;
    },
    // Vite does not currently connect addWatchFile() calls made while loading a
    // synthetic module back to that module's HMR graph. Real source transforms
    // do not need this bridge, and thin source-backed facades will remove it.
    hotUpdate(options) {
      const affected = [...(modulesByWatchFile.get(resolve(options.file)) ?? [])]
        .map((id) => this.environment.moduleGraph.getModuleById(id))
        .filter((module) => module !== undefined);
      if (affected.length === 0) return;

      for (const module of affected) this.environment.moduleGraph.invalidateModule(module);
      return [...new Set([...options.modules, ...affected])];
    },
    transform: {
      order: 'pre',
      filter: {
        id: {
          include: options.include ?? /\.tsx(?:\?|$)/,
          ...(options.exclude ? { exclude: options.exclude } : {}),
        },
      },
      async handler(code, id) {
        const projection = parseProjectionId(id, options.projections);
        const selected = projection ? options.projections?.[projection.name] : options.transform;
        if (!selected) return null;

        const configured =
          typeof selected === 'function'
            ? await selected({ id: projection!.id, name: projection!.name, parameters: projection!.parameters })
            : selected;
        const config = {
          ...(configured.target ? { target: configured.target } : {}),
          plugins: [
            ...(configured.registry ? [registryPlugin(configured.registry)] : []),
            ...(configured.plugins ?? []),
          ],
        };
        for (const file of configured.registry?.watchFiles ?? []) this.addWatchFile(resolve(file));
        let result: Awaited<ReturnType<typeof transform>>;
        try {
          result = await transform(code, {
            filename: cleanId(id),
            config,
            configDir: cwd,
            outputFile: cleanId(id),
          });
        } catch (error) {
          if (error instanceof CompilerError) this.error(bundlerLogFromDiagnostic(error.diagnostics[0]!));
          throw error;
        }
        for (const diagnostic of result.diagnostics) {
          if (diagnostic.level === 'warning') this.warn(bundlerLogFromDiagnostic(diagnostic));
          else this.error(bundlerLogFromDiagnostic(diagnostic));
        }
        for (const file of result.watchFiles) this.addWatchFile(resolve(file));

        const previousCssIds = cssIdsByOwner.get(id) ?? new Set<string>();
        const nextCssIds = new Set<string>();
        cssIdsByOwner.set(id, nextCssIds);

        const imports = [
          ...new Set(
            result.assets
              .filter((asset) => asset.type === 'css')
              .map((asset) => {
                const publicId = cssVirtualId(asset.fileName, asset.source);
                cssById.set(publicId, asset.source);
                nextCssIds.add(publicId);
                return `import ${JSON.stringify(publicId)};`;
              })
          ),
        ];
        for (const publicId of previousCssIds) {
          if (nextCssIds.has(publicId)) continue;
          const referenced = [...cssIdsByOwner.values()].some((ids) => ids.has(publicId));
          if (!referenced) cssById.delete(publicId);
        }

        return {
          code: imports.length > 0 ? `${imports.join('\n')}\n${result.code}` : result.code,
          map: offsetSourceMap(result.map, imports.length),
        };
      },
    },
    async generateBundle(_outputOptions, bundle) {
      for (const declaration of options.declarations ?? []) {
        const generated = await modules.load(declaration.id);
        if (!generated) throw new Error(`VJSC declaration module does not exist: ${declaration.id}`);

        this.emitFile({
          type: 'asset',
          fileName: declaration.fileName,
          source: createGeneratedModuleDeclaration(generated, resolve(declaration.sourceFileName)),
        });
      }

      for (const output of outputs) {
        const resolvedId = modules.resolveId(output.moduleId);
        const chunks = Object.entries(bundle).filter(
          (entry): entry is [string, Extract<(typeof bundle)[string], { type: 'chunk' }>] =>
            entry[1].type === 'chunk' && entry[1].facadeModuleId === resolvedId
        );
        if (chunks.length === 0) continue;

        const built = await output.build();
        addWatchFiles(this, built);
        for (const file of built.files) {
          this.emitFile({ type: 'asset', fileName: file.path, source: file.content });
        }
        for (const [fileName] of chunks) delete bundle[fileName];
      }
    },
  };

  return plugin;
}

interface ProjectionId {
  readonly id: string;
  readonly name: string;
  readonly parameters: URLSearchParams;
}

function parseProjectionId(id: string, projections: VjscPluginOptions['projections']): ProjectionId | null {
  if (!projections) return null;
  const queryIndex = id.indexOf('?');
  if (queryIndex === -1) return null;

  const parameters = new URLSearchParams(id.slice(queryIndex + 1));
  const name = parameters.get('framework');
  if (!name || !projections[name]) return null;
  return { id: id.slice(0, queryIndex), name, parameters };
}

function cleanId(id: string): string {
  const queryIndex = id.indexOf('?');
  return queryIndex === -1 ? id : id.slice(0, queryIndex);
}

function withParameters(id: string, parameters: URLSearchParams): string {
  const normalized = new URLSearchParams(
    [...parameters.entries()].sort(([left], [right]) => left.localeCompare(right))
  );
  return `${id}?${normalized}`;
}

function addWatchFiles(context: { addWatchFile(id: string): void }, module: Pick<VjscModule, 'watchFiles'>): void {
  for (const fileName of module.watchFiles) context.addWatchFile(resolve(fileName));
}

function updateModuleWatchFiles(
  moduleId: string,
  files: readonly string[],
  filesByModule: Map<string, Set<string>>,
  modulesByFile: Map<string, Set<string>>
): void {
  const previous = filesByModule.get(moduleId) ?? new Set<string>();
  const next = new Set(files.map((fileName) => resolve(fileName)));

  for (const fileName of previous) {
    if (next.has(fileName)) continue;
    const moduleIds = modulesByFile.get(fileName);
    moduleIds?.delete(moduleId);
    if (moduleIds?.size === 0) modulesByFile.delete(fileName);
  }

  for (const fileName of next) {
    const moduleIds = modulesByFile.get(fileName) ?? new Set<string>();
    moduleIds.add(moduleId);
    modulesByFile.set(fileName, moduleIds);
  }

  filesByModule.set(moduleId, next);
}

function resolvedVirtualModuleId(publicId: string): string {
  if (publicId.endsWith('.jsx') || publicId.endsWith('.tsx')) return publicId;
  return `\0${publicId}`;
}

function cssVirtualId(fileName: string, source: string): string {
  const hash = createHash('sha256').update(fileName).update('\0').update(source).digest('hex').slice(0, 12);
  return `virtual:vjsc/css/${hash}/${encodeURIComponent(fileName)}`;
}

function offsetSourceMap(map: CompilerSourceMap, lines: number): CompilerSourceMap {
  return lines === 0 ? map : { ...map, mappings: `${';'.repeat(lines)}${map.mappings}` };
}

function bundlerLogFromDiagnostic(diagnostic: CompilerDiagnostic): RolldownLog | string {
  if (!diagnostic.file || !diagnostic.line) return diagnostic.message;
  return {
    message: diagnostic.message,
    id: diagnostic.file,
    loc: {
      file: diagnostic.file,
      line: diagnostic.line,
      column: diagnostic.column ?? 0,
    },
    pluginCode: diagnostic.code,
  };
}

export default vjscPlugin;
