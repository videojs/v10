import { type CompileTarget, compile } from '../compile';

export interface VideojsCompilerPluginOptions {
  target?: CompileTarget | undefined;
  include?: readonly string[] | undefined;
}

export interface VitePlugin {
  name: string;
  enforce?: 'pre' | 'post';
  transform?: (code: string, id: string) => { code: string; map?: unknown } | null;
}

export function vjsCompiler(options: VideojsCompilerPluginOptions = {}): VitePlugin {
  const target: CompileTarget = options.target ?? 'react';
  const include = options.include ?? ['.tsx'];

  return {
    name: '@videojs/compiler',
    enforce: 'pre',
    transform(code, id) {
      if (!include.some((ext) => id.endsWith(ext))) return null;
      return compile(code, { filename: id, target });
    },
  };
}

export default vjsCompiler;
