import { transform } from '@svgr/core';
import { type OutputChunk, rolldown } from 'rolldown';
import { optimizeSvg } from './svg.js';

const VIRTUAL_ICON_ID = '\0videojs-icon.jsx';

export async function buildReactIconModule(
  svgContent: string,
  componentName: string
): Promise<{ js: string; tsx: string }> {
  const optimized = optimizeSvg(svgContent);
  const transformOptions: Parameters<typeof transform>[1] = {
    plugins: ['@svgr/plugin-jsx'],
    jsxRuntime: 'automatic',
  };
  const tsx = await transform(optimized, { ...transformOptions, typescript: true }, { componentName });
  const jsx = await transform(optimized, transformOptions, { componentName });
  const bundle = await rolldown({
    input: VIRTUAL_ICON_ID,
    external: /^react(?:\/|$)/,
    plugins: [
      {
        name: 'videojs-icon-module',
        resolveId(id) {
          if (id === VIRTUAL_ICON_ID) return id;
        },
        load(id) {
          if (id === VIRTUAL_ICON_ID) return jsx;
        },
      },
    ],
  });

  const result = await bundle.generate({ format: 'esm', comments: false }).finally(() => bundle.close());
  const chunks = result.output.filter((output): output is OutputChunk => output.type === 'chunk');
  if (chunks.length !== 1) {
    throw new Error(`Expected one generated module for ${componentName}, received ${chunks.length}.`);
  }

  const js = chunks[0]?.code;
  if (!js) throw new Error(`No generated module was produced for ${componentName}.`);
  return { js, tsx };
}

export function buildHtmlIconModule(svgContent: string, variableName: string): string {
  return `export const ${variableName} = \`${optimizeSvg(svgContent)}\`;\n`;
}
