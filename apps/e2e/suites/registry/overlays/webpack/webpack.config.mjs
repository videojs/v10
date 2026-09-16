import { fileURLToPath } from 'node:url';

import HtmlWebpackPlugin from 'html-webpack-plugin';

const source = fileURLToPath(new URL('./src', import.meta.url));

export default {
  entry: `${source}/main.tsx`,
  output: {
    path: fileURLToPath(new URL('./dist', import.meta.url)),
    filename: '[name].[contenthash].js',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: { '@': source },
  },
  module: {
    rules: [
      // Types are checked separately with `tsc`; the loader only strips them.
      { test: /\.tsx?$/, exclude: /node_modules/, loader: 'ts-loader', options: { transpileOnly: true } },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  plugins: [new HtmlWebpackPlugin({ template: `${source}/index.html` })],
  performance: { hints: false },
};
