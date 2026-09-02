import { fileURLToPath } from 'node:url';

import { rspack } from '@rspack/core';

const source = fileURLToPath(new URL('./src', import.meta.url));

export default {
  entry: `${source}/main.ts`,
  output: {
    path: fileURLToPath(new URL('./dist', import.meta.url)),
    filename: '[name].[contenthash].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: { '@': source },
  },
  module: {
    rules: [
      { test: /\.ts$/, exclude: /node_modules/, loader: 'builtin:swc-loader', type: 'javascript/auto' },
      // The registry's HTML skin templates are imported as strings.
      { resourceQuery: /raw/, type: 'asset/source' },
      { test: /\.css$/, type: 'css' },
    ],
  },
  plugins: [new rspack.HtmlRspackPlugin({ template: `${source}/index.html` })],
  // Rspack's built-in CSS pipeline is opt-in; the skin's stylesheets are imported from its module.
  experiments: { css: true },
  performance: { hints: false },
};
