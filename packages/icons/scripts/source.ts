import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { transform } from '@svgr/core';
import { transform as esbuildTransform } from 'esbuild';
import { optimize } from 'svgo';
import { iconBases } from './icon-bases.js';
import {
  ASSETS_DIR,
  createSvgoConfig,
  getSvgFiles,
  PRESET_DEFAULT_OVERRIDES,
  REMOVE_ATTRS_PLUGIN,
  replaceColors,
} from './shared.js';

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

export async function createReactIconsSource(componentNames: readonly string[], iconSet = 'default'): Promise<string> {
  const icons = await resolveIcons(componentNames, iconSet);
  const components = await Promise.all(
    icons.map(async ({ componentName, source }) => {
      const { tsx } = await buildReactComponent(source, componentName);
      return tsx
        .replace(/^import type \{ SVGProps \} from ['"]react['"];?\s*/m, '')
        .replace(/style=\{\{([\s\S]*?)\}\}/g, 'style={{$1} as CSSProperties & Record<string, string | number>}')
        .replace(`const ${componentName} =`, `export const ${componentName} =`)
        .replace(new RegExp(`\\s*export default ${componentName};?\\s*$`), '');
    })
  );
  const reactTypes = components.some((component) => component.includes('CSSProperties'))
    ? 'CSSProperties, SVGProps'
    : 'SVGProps';

  return [`import type { ${reactTypes} } from 'react';`, ``, ...components, ``].join('\n');
}

export async function createHtmlIconsSource(componentNames: readonly string[], iconSet = 'default'): Promise<string> {
  const icons = await resolveIcons(componentNames, iconSet);
  const entries = icons.map(({ fileName, source }) => `  '${fileName}': \`${optimizeSvg(source)}\`,`);

  return [
    `import '@videojs/html/icons/element';`,
    ``,
    `interface MediaIconConstructor extends CustomElementConstructor {`,
    `  register(family: string, icons: Readonly<Record<string, string>>): void;`,
    `}`,
    ``,
    `const icons = {`,
    ...entries,
    `};`,
    ``,
    `if (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') {`,
    `  const iconElement = customElements.get('media-icon') as MediaIconConstructor | undefined;`,
    `  iconElement?.register('${iconSet}', icons);`,
    `}`,
    ``,
  ].join('\n');
}

async function resolveIcons(
  componentNames: readonly string[],
  iconSet: string
): Promise<Array<{ componentName: string; fileName: string; source: string }>> {
  const byComponent = new Map(
    getSvgFiles(iconSet).map((file) => {
      const fileName = file.slice(0, -'.svg'.length);
      return [`${iconBases(fileName).pascal}Icon`, fileName] as const;
    })
  );

  return Promise.all(
    [...new Set(componentNames)].sort().map(async (componentName) => {
      const fileName = byComponent.get(componentName);
      if (!fileName) throw new Error(`Unknown ${iconSet} icon component \`${componentName}\`.`);
      return {
        componentName,
        fileName,
        source: await readFile(join(ASSETS_DIR, iconSet, `${fileName}.svg`), 'utf8'),
      };
    })
  );
}
