import viteReact, { type Options as ViteReactOptions } from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

interface ReactCompilerPluginOptions {
  compiler?: Exclude<ViteReactOptions['compiler'], false>;
  exclude?: ViteReactOptions['exclude'];
  include?: ViteReactOptions['include'];
}

/** Creates the native React Compiler transform, targeting React 18 by default for published packages. */
export function reactCompilerPlugin({
  compiler = { target: '18' },
  exclude = [/\.d\.[cm]?ts$/, /node_modules/],
  include,
}: ReactCompilerPluginOptions = {}): Plugin {
  const plugin = viteReact({ compiler, exclude, include }).find(({ name }) => name === 'vite:react-compiler');
  if (!plugin) throw new Error('Expected @vitejs/plugin-react to return the native React Compiler plugin.');

  // SAFETY: @vitejs/plugin-react and the workspace resolve Plugin from the catalog-pinned Vite implementation.
  return plugin as Plugin;
}
