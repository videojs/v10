import { createHash } from 'node:crypto';
import { createFilter, type FilterPattern, type Plugin } from 'vite';
import type { CompilerConfig, CompilerDiagnostic, CompilerSourceMap } from '../config';
import { type LoadedCompilerConfig, loadConfig } from '../load-config';
import { CompilerError, transform } from '../transform';

export type VideojsCompilerPluginOptions = {
  include?: FilterPattern | undefined;
  exclude?: FilterPattern | undefined;
} & (
  | {
      config?: CompilerConfig | undefined;
      configFile?: never;
    }
  | {
      config?: never;
      configFile?: string | undefined;
    }
);

type ViteHookContext<Hook> = Hook extends (this: infer Context, ...args: never[]) => unknown
  ? Context
  : Hook extends { handler: (this: infer Context, ...args: never[]) => unknown }
    ? Context
    : never;

type ViteTransformContext = ViteHookContext<NonNullable<Plugin['transform']>>;
type VitePluginDiagnostic = ViteTransformContext extends { error: (...args: infer ErrorParameters) => unknown }
  ? ErrorParameters[0]
  : string;

export function vjsCompiler(options: VideojsCompilerPluginOptions = {}): Plugin {
  const filter = createFilter(options.include ?? /\.tsx$/, options.exclude);
  const cssById = new Map<string, string>();
  const cssIdsByOwner = new Map<string, Set<string>>();
  let root = process.cwd();
  let loadedConfig: LoadedCompilerConfig | null | undefined;

  const getConfig = async (): Promise<{ config: CompilerConfig; configDir: string; configPath?: string }> => {
    if (options.config) return { config: options.config, configDir: root };
    loadedConfig ??= await loadConfig(root, options.configFile);
    if (!loadedConfig) return { config: {}, configDir: root };
    return {
      config: loadedConfig.config,
      configDir: loadedConfig.configDir,
      configPath: loadedConfig.configPath,
    };
  };

  return {
    name: 'vjsc',
    enforce: 'pre',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return cssById.has(id) ? `\0${id}` : null;
    },
    load(id) {
      if (!id.startsWith('\0')) return null;
      return cssById.get(id.slice(1)) ?? null;
    },
    watchChange(id) {
      if (loadedConfig?.configPath === id) loadedConfig = undefined;
    },
    async transform(code, id) {
      if (!filter(id)) return null;

      const { config, configDir, configPath } = await getConfig();
      if (configPath) this.addWatchFile(configPath);

      let result: Awaited<ReturnType<typeof transform>>;
      try {
        result = await transform(code, { filename: id, config, configDir, outputFile: id });
      } catch (error) {
        if (error instanceof CompilerError) this.error(viteLogFromDiagnostic(error.diagnostics[0]!));
        throw error;
      }
      for (const diagnostic of result.diagnostics) {
        if (diagnostic.level === 'warning') this.warn(viteLogFromDiagnostic(diagnostic));
        else this.error(viteLogFromDiagnostic(diagnostic));
      }
      for (const file of result.watchFiles) this.addWatchFile(file);

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
  };
}

function cssVirtualId(fileName: string, source: string): string {
  const hash = createHash('sha256').update(fileName).update('\0').update(source).digest('hex').slice(0, 12);
  return `virtual:vjsc/css/${hash}/${encodeURIComponent(fileName)}`;
}

function offsetSourceMap(map: CompilerSourceMap, lines: number): CompilerSourceMap {
  return lines === 0 ? map : { ...map, mappings: `${';'.repeat(lines)}${map.mappings}` };
}

function viteLogFromDiagnostic(diagnostic: CompilerDiagnostic): VitePluginDiagnostic {
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

export default vjsCompiler;
