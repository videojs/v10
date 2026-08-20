import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { HookFilter, Plugin, RolldownLog } from 'rolldown';

import type { CompilerDiagnostic, CompilerPlugin, CompilerSourceMap, CompilerTarget } from '../config';
import { type ComponentRegistry, plugin as registryPlugin } from '../registry';
import { CompilerError, transform } from '../transform';
import { HTML_RUNTIME, HTML_RUNTIME_ID, HTML_RUNTIME_IMPORT } from './html-runtime';

export interface VjscPluginOptions {
  /** Native Rolldown transform-hook filter. Defaults to TSX modules. */
  readonly filter?: HookFilter | undefined;
  /** Select a VJSC transform for each module, or return null to defer. */
  readonly transform?: VjscTransformConfig | VjscTransformer | undefined;
  /** Directory used to resolve relative transform configuration. */
  readonly cwd?: string | undefined;
}

export interface VjscTransformConfig {
  readonly target?: CompilerTarget | undefined;
  readonly registry?: ComponentRegistry | undefined;
  readonly plugins?: readonly CompilerPlugin[] | undefined;
}

export interface VjscTransformContext {
  readonly code: string;
  readonly id: string;
  readonly filename: string;
  readonly parameters: URLSearchParams;
}

export type VjscTransformer = (
  context: VjscTransformContext
) => VjscTransformConfig | null | Promise<VjscTransformConfig | null>;

/** Apply VJSC transforms and generated modules through any Rolldown-compatible host. */
export function vjscPlugin(options: VjscPluginOptions = {}): Plugin {
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

        const resolved = await this.resolve(transformed?.id ?? id, importer ? cleanId(importer) : undefined, {
          ...resolveOptions,
          skipSelf: true,
        });
        if (!resolved || resolved.external || !cleanId(resolved.id).endsWith('.tsx')) return resolved;

        return {
          ...resolved,
          id: withParameters(cleanId(resolved.id), transformed?.parameters ?? inherited!.parameters),
        };
      },
    },
    async load(id) {
      if (id === HTML_RUNTIME_ID) return { code: HTML_RUNTIME, moduleType: 'js' };

      const transformed = parseTransformedId(id);
      if (transformed) {
        this.addWatchFile(transformed.id);
        return { code: await readFile(transformed.id, 'utf8'), moduleType: 'tsx' };
      }

      const publicId = id.startsWith('\0') ? id.slice(1) : id;
      const css = cssById.get(publicId);
      if (css !== undefined) return css;
      return null;
    },
    transform: {
      order: 'pre',
      filter: options.filter ?? { id: /\.tsx(?:\?|$)/ },
      async handler(code, id) {
        const transformed = parseId(id);
        const selected = options.transform ?? {};
        const configured =
          typeof selected === 'function'
            ? await selected({ code, id, filename: transformed.id, parameters: transformed.parameters })
            : selected;
        if (!configured) return null;
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
  };
}

interface ParsedId {
  readonly id: string;
  readonly parameters: URLSearchParams;
}

function parseTransformedId(id: string): ParsedId | null {
  const parsed = parseId(id);
  return parsed.parameters.has('framework') ? parsed : null;
}

function parseId(id: string): ParsedId {
  const queryIndex = id.indexOf('?');
  return queryIndex === -1
    ? { id, parameters: new URLSearchParams() }
    : { id: id.slice(0, queryIndex), parameters: new URLSearchParams(id.slice(queryIndex + 1)) };
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
