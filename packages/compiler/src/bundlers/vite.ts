import type { Plugin } from 'vite';
import { compile } from '../compile';
import type { CompilerConfig, CompilerDiagnostic } from '../config';
import { type LoadedCompilerConfig, loadConfig } from '../load-config';

export interface VideojsCompilerPluginOptions {
  config?: CompilerConfig | undefined;
  configFile?: string | undefined;
  include?: readonly string[] | undefined;
  exclude?: readonly string[] | undefined;
}

type ViteHookContext<Hook> = Hook extends (this: infer Context, ...args: never[]) => unknown
  ? Context
  : Hook extends { handler: (this: infer Context, ...args: never[]) => unknown }
    ? Context
    : never;

type ViteTransformContext = ViteHookContext<NonNullable<Plugin['transform']>>;
type VitePluginWarning = ViteTransformContext extends { warn: (...args: infer WarningParameters) => unknown }
  ? WarningParameters[0]
  : string;

export function vjsCompiler(options: VideojsCompilerPluginOptions = {}): Plugin {
  const include = options.include ?? ['.tsx'];
  const exclude = options.exclude ?? [];
  const cssById = new Map<string, string>();
  let root = process.cwd();
  let loadedConfig: LoadedCompilerConfig | null | undefined;

  const getConfig = async (): Promise<{ config: CompilerConfig; configDir: string }> => {
    if (options.config) return { config: options.config, configDir: root };
    loadedConfig ??= await loadConfig(root, options.configFile);
    if (!loadedConfig) return { config: {}, configDir: root };
    return { config: loadedConfig.config, configDir: loadedConfig.configDir };
  };

  return {
    name: '@videojs/compiler',
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
    async transform(code, id) {
      if (!include.some((ext) => id.endsWith(ext))) return null;
      if (exclude.some((ext) => id.endsWith(ext))) return null;

      const { config, configDir } = await getConfig();
      const result = await compile(code, { filename: id, config, configDir });
      for (const diagnostic of result.diagnostics) {
        if (diagnostic.level === 'warning') this.warn(viteWarningFromDiagnostic(diagnostic));
      }

      const imports = result.assets
        .filter((asset) => asset.type === 'css')
        .map((asset, index) => {
          const publicId = cssVirtualId(id, asset.fileName, index);
          cssById.set(publicId, asset.source);
          return `import ${JSON.stringify(publicId)};`;
        });

      return { code: imports.length > 0 ? `${imports.join('\n')}\n${result.code}` : result.code, map: result.map };
    },
  };
}

function cssVirtualId(id: string, fileName: string, index: number): string {
  return `virtual:@videojs/compiler/css/${encodeURIComponent(id)}/${index}/${encodeURIComponent(fileName)}`;
}

function viteWarningFromDiagnostic(diagnostic: CompilerDiagnostic): VitePluginWarning {
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
