import viteReact from '@vitejs/plugin-react';

/** Creates the native React Compiler transform for published React 18-compatible packages. */
export function reactCompilerPlugin(include?: RegExp) {
  const [plugin] = viteReact({
    compiler: { target: '18' },
    include,
    exclude: [/\.d\.[cm]?ts$/, /node_modules/],
  });

  if (plugin?.name !== 'vite:react-compiler') {
    throw new Error('Expected @vitejs/plugin-react to return the native React Compiler plugin first.');
  }

  return plugin;
}
