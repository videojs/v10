import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

import type { GeneralHookFilter, Plugin, RolldownLog } from 'rolldown';

import type { CompilerConfig, CompilerDiagnostic, CompilerSourceMap } from '../config';
import type { GeneratedModule } from '../generate';
import { CompilerError, transform } from '../transform';
import { createGeneratedModuleDeclaration } from './declaration';
import { createBundleModules, type VirtualModuleDefinition } from './modules';

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
  /** Transform configuration applied to included source modules. */
  readonly config?: CompilerConfig | undefined;
  /** Directory used to resolve relative transform configuration. */
  readonly cwd?: string | undefined;
  /** Generated modules served without materializing their source. */
  readonly modules?: readonly VirtualModuleDefinition[] | undefined;
  /** Map public virtual IDs to filesystem-shaped IDs for downstream transforms. */
  readonly resolveModuleId?: ((id: VirtualModuleDefinition['id']) => string) | undefined;
  /** Declaration assets emitted from generated modules during a build. */
  readonly declarations?: readonly VjscDeclarationOutput[] | undefined;
}

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
  const cssById = new Map<string, string>();
  const cssIdsByOwner = new Map<string, Set<string>>();
  const watchFilesByModule = new Map<string, Set<string>>();
  const modulesByWatchFile = new Map<string, Set<string>>();
  const modules = createBundleModules({
    modules: options.modules ?? [],
    resolveId: options.resolveModuleId ?? resolvedVirtualModuleId,
  });

  const plugin: Plugin & HotUpdatePlugin = {
    name: 'vjsc',
    resolveId(id) {
      if (cssById.has(id)) return `\0${id}`;
      return modules.resolveId(id);
    },
    async load(id) {
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
          include: options.include ?? /\.tsx$/,
          ...(options.exclude ? { exclude: options.exclude } : {}),
        },
      },
      async handler(code, id) {
        let result: Awaited<ReturnType<typeof transform>>;
        try {
          result = await transform(code, {
            filename: id,
            config: options.config ?? {},
            configDir: cwd,
            outputFile: id,
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
    async generateBundle() {
      for (const declaration of options.declarations ?? []) {
        const generated = await modules.load(declaration.id);
        if (!generated) throw new Error(`VJSC declaration module does not exist: ${declaration.id}`);

        this.emitFile({
          type: 'asset',
          fileName: declaration.fileName,
          source: createGeneratedModuleDeclaration(generated, resolve(declaration.sourceFileName)),
        });
      }
    },
  };

  return plugin;
}

function addWatchFiles(context: { addWatchFile(id: string): void }, module: GeneratedModule): void {
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
