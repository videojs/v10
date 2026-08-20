import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { GeneralHookFilter, HookFilter, Plugin, RolldownLog } from 'rolldown';
import { isVjscModule, moduleFilename, moduleId, type ParsedModuleId, parseModuleId } from '../utils/module-id';
import { HTML_RUNTIME, HTML_RUNTIME_ID, HTML_RUNTIME_IMPORT } from './html-runtime';
import { CompilerError, transform } from './transform';
import type { CompilerConfig, CompilerDiagnostic, CompilerSourceMap } from './types';

interface TransformPluginOptions {
  /** Select a VJSC transform for each module, or return null to defer. */
  readonly transform?: CompilerConfig | VjscTransformer | undefined;
  /** Directory used to resolve relative transform configuration. */
  readonly cwd?: string | undefined;
}

export interface VjscTransformContext {
  readonly code: string;
  readonly id: string;
  readonly filename: string;
  readonly parameters: URLSearchParams;
}

export type VjscTransformer = (context: VjscTransformContext) => CompilerConfig | null | Promise<CompilerConfig | null>;

interface TransformPluginFilter {
  readonly hook?: HookFilter | undefined;
  readonly test?: ((id: string) => boolean) | undefined;
}

/** A native Rolldown ID pattern accepted by include and exclude filters. */
export type FilterPattern = Exclude<GeneralHookFilter, { include?: unknown; exclude?: unknown }>;

export interface VjscPluginOptions extends TransformPluginOptions {
  /** Modules passed to the transform hook. Defaults to TSX and projected VJSC modules. */
  readonly include?: FilterPattern | undefined;
  /** Modules omitted from the transform hook. */
  readonly exclude?: FilterPattern | undefined;
}

/** Apply VJSC transforms through Rolldown or a Rolldown-compatible host. */
export function vjscPlugin(options: VjscPluginOptions = {}): Plugin {
  const { include, exclude, ...transformOptions } = options;
  return createVjscPlugin(transformOptions, {
    hook: {
      id: {
        include: normalizeFilter(include ?? [/\.tsx(?:\?|$)/, /\.[cm]?[jt]sx?\?[^#]*framework=/]),
        ...(exclude ? { exclude: normalizeFilter(exclude) } : {}),
      },
    },
  });
}

function createVjscPlugin(options: TransformPluginOptions = {}, filter: TransformPluginFilter = {}): Plugin {
  const cwd = resolve(options.cwd ?? process.cwd());
  const cssById = new Map<string, string>();
  const cssIdsByOwner = new Map<string, Set<string>>();

  return {
    name: 'vjsc',
    resolveId: {
      order: 'pre',
      async handler(id, importer, resolveOptions) {
        if (id === HTML_RUNTIME_IMPORT || id === `${HTML_RUNTIME_IMPORT.replace('/jsx-runtime', '')}/jsx-dev-runtime`) {
          return HTML_RUNTIME_ID;
        }
        if (cssById.has(id)) return `\0${id}`;

        const transformed = parseTransformedId(id);
        const inherited = importer ? parseTransformedId(importer) : null;
        if (!transformed && (!inherited || !id.startsWith('.'))) return null;

        const resolved = await this.resolve(
          transformed?.filename ?? id,
          importer ? moduleFilename(importer) : undefined,
          {
            ...resolveOptions,
            skipSelf: true,
          }
        );
        if (!resolved || resolved.external || !isVjscModule(resolved.id)) return resolved;

        return {
          ...resolved,
          id: moduleId(moduleFilename(resolved.id), transformed?.parameters ?? inherited!.parameters),
        };
      },
    },
    async load(id) {
      if (id === HTML_RUNTIME_ID) return { code: HTML_RUNTIME, moduleType: 'js' };

      const transformed = parseTransformedId(id);
      if (transformed) {
        this.addWatchFile(transformed.filename);
        return { code: await readFile(transformed.filename, 'utf8'), moduleType: 'tsx' };
      }

      const publicId = id.startsWith('\0') ? id.slice(1) : id;
      const css = cssById.get(publicId);
      if (css !== undefined) return css;
      return null;
    },
    transform: {
      order: 'pre',
      ...(filter.hook ? { filter: filter.hook } : {}),
      async handler(code, id) {
        if (filter.test && !filter.test(id)) return null;

        const transformed = parseModuleId(id);
        const selected = options.transform ?? {};
        const configured =
          typeof selected === 'function'
            ? await selected({ code, id, filename: transformed.filename, parameters: transformed.parameters })
            : selected;

        if (!configured) return null;

        let result: Awaited<ReturnType<typeof transform>>;

        try {
          result = await transform(code, {
            filename: moduleFilename(id),
            config: configured,
            configDir: cwd,
            outputFile: moduleFilename(id),
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

        const output = imports.length > 0 ? `${imports.join('\n')}\n${result.code}` : result.code;
        return {
          code: output,
          map: offsetSourceMap(result.map, imports.length),
          meta: { vjsc: { source: output } },
        };
      },
    },
  };
}

/** Read editable VJSC output retained across later host transforms. */
export function readVjscSource(meta: unknown): string | undefined {
  if (!meta || typeof meta !== 'object') return undefined;

  const vjsc = Reflect.get(meta, 'vjsc');
  if (!vjsc || typeof vjsc !== 'object') return undefined;

  const source = Reflect.get(vjsc, 'source');

  return typeof source === 'string' ? source : undefined;
}

function parseTransformedId(id: string): ParsedModuleId | null {
  const parsed = parseModuleId(id);
  return parsed.parameters.has('framework') ? parsed : null;
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

function normalizeFilter(pattern: FilterPattern): string | RegExp | (string | RegExp)[] {
  return Array.isArray(pattern) ? [...pattern] : (pattern as string | RegExp);
}
