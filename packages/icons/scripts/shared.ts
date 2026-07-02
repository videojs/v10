import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Config, PluginConfig } from 'svgo';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT = join(__dirname, '..');
export const ASSETS_DIR = join(ROOT, 'src/assets');
export const DIST_DIR = join(ROOT, 'dist');

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

export function getIconSets(): string[] {
  if (!existsSync(ASSETS_DIR)) {
    console.error(`Assets directory not found: ${ASSETS_DIR}`);
    process.exit(1);
  }
  return readdirSync(ASSETS_DIR).filter((item) => !item.startsWith('.') && item !== 'index');
}

export function getSvgFiles(setName: string): string[] {
  return readdirSync(join(ASSETS_DIR, setName)).filter((f) => f.endsWith('.svg'));
}
