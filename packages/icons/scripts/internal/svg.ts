import type { Config, PluginConfig } from 'svgo';
import { optimize } from 'svgo';

export const PRESET_DEFAULT_OVERRIDES = {
  convertColors: {
    currentColor: /^black$/,
  },
} as const;

export const REMOVE_ATTRS_PLUGIN: PluginConfig = {
  name: 'removeAttrs',
  params: {
    attrs: ['^clip-rule$', '^fill-rule$'],
  },
};

export function createSvgoConfig(plugins: PluginConfig[], options?: Omit<Config, 'plugins'>): Config {
  return { multipass: true, ...options, plugins };
}

export function replaceColors(svg: string): string {
  return svg.replaceAll('fill="black"', 'fill="currentColor"').replaceAll('stroke="black"', 'stroke="currentColor"');
}

const GENERATED_SVG_CONFIG = createSvgoConfig([
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

export function optimizeSvg(svg: string): string {
  return replaceColors(optimize(svg, GENERATED_SVG_CONFIG).data);
}
