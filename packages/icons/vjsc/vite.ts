import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import type { Plugin } from 'vite';

import { optimizeSvg } from '../scripts/internal/svg.ts';

const elementId = '@videojs/icons/element';
const familyName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const iconsRoot = resolve(import.meta.dirname, '..');
const assetsRoot = resolve(iconsRoot, 'src/assets');
const elementSource = resolve(iconsRoot, 'src/element.ts');

/** Serves source icon families to Vite without building Icons first. */
export function iconElementSourcePlugin(): Plugin {
  return {
    name: 'videojs:icons:element-source',
    enforce: 'pre',
    configureServer(server) {
      server.watcher.add(assetsRoot);
    },
    resolveId(id) {
      return iconFamily(id) ? `\0${id}` : null;
    },
    load(id) {
      if (!id.startsWith(`\0${elementId}`)) return null;

      const family = iconFamily(id.slice(1));
      if (!family) return null;

      const directory = resolve(assetsRoot, family);
      if (!existsSync(directory)) throw new Error(`Unknown icon family: ${family}`);

      const files = readdirSync(directory)
        .filter((file) => file.endsWith('.svg'))
        .sort();
      if (files.length === 0) throw new Error(`Icon family \`${family}\` does not contain any SVG assets.`);

      const icons = Object.fromEntries(
        files.map((file) => {
          const path = resolve(directory, file);

          this.addWatchFile(path);
          return [basename(file, '.svg'), optimizeSvg(readFileSync(path, 'utf8'))];
        })
      );

      return iconFamilyModule(family, icons, elementSource);
    },
  };
}

function iconFamily(id: string): string | null {
  const family = id === elementId ? 'default' : id.startsWith(`${elementId}/`) ? id.slice(elementId.length + 1) : '';

  return familyName.test(family) ? family : null;
}

function iconFamilyModule(family: string, icons: Readonly<Record<string, string>>, runtime: string): string {
  return [
    `import { MediaIconElement } from ${JSON.stringify(runtime)};`,
    `const icons = ${JSON.stringify(icons)};`,
    ``,
    `if (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') {`,
    `  const mediaIconElement = customElements.get('media-icon') || MediaIconElement;`,
    `  mediaIconElement.register?.(${JSON.stringify(family)}, icons);`,
    `  if (!customElements.get('media-icon')) customElements.define('media-icon', MediaIconElement);`,
    `}`,
    ``,
  ].join('\n');
}
