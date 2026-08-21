import type { CompilerModule, CompilerPlugin } from '../types';

export interface JsxPluginOptions {
  /** JSX runtime used by the downstream tool that lowers this projection. */
  readonly importSource: string | ((module: CompilerModule) => string | null | Promise<string | null>);
}

/** Declare the JSX runtime for matching transformed modules. */
export function jsx(options: JsxPluginOptions): CompilerPlugin {
  return {
    name: 'vjsc:jsx',
    async transform(module, context) {
      const selected = options.importSource;
      const importSource = typeof selected === 'function' ? await selected(module) : selected;
      if (!importSource) return null;
      context.prepend(`/** @jsxImportSource ${importSource} */`);
      return null;
    },
  };
}

/** Declare the internal JSX runtime used by editable HTML projections. */
export function html(): CompilerPlugin {
  return jsx({ importSource: 'vjsc/html-runtime' });
}
