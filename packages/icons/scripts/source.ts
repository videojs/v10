import { transform } from '@svgr/core';
import { transform as esbuildTransform } from 'esbuild';
import { optimize } from 'svgo';
import { createSvgoConfig, PRESET_DEFAULT_OVERRIDES, REMOVE_ATTRS_PLUGIN, replaceColors } from './shared.js';

const SVGO_CONFIG = createSvgoConfig([
  {
    name: 'preset-default',
    params: { overrides: PRESET_DEFAULT_OVERRIDES },
  },
  REMOVE_ATTRS_PLUGIN,
  {
    name: 'addAttributesToSVGElement',
    params: {
      attributes: [{ 'aria-hidden': 'true' }],
    },
  },
]);

export function optimizeSvg(svgContent: string): string {
  return replaceColors(optimize(svgContent, SVGO_CONFIG).data);
}

export async function buildReactComponent(
  svgContent: string,
  componentName: string
): Promise<{ js: string; tsx: string }> {
  const optimized = optimizeSvg(svgContent);
  const transformOpts: Parameters<typeof transform>[1] = {
    plugins: ['@svgr/plugin-jsx'],
    jsxRuntime: 'automatic',
  };
  const tsxCode = await transform(optimized, { ...transformOpts, typescript: true }, { componentName });
  const jsxCode = await transform(optimized, transformOpts, { componentName });
  const { code } = await esbuildTransform(jsxCode, { loader: 'jsx', jsx: 'automatic' });

  return { js: code, tsx: tsxCode };
}

export function buildHtmlExport(svgContent: string, varName: string): string {
  return `export const ${varName} = \`${optimizeSvg(svgContent)}\`;\n`;
}
