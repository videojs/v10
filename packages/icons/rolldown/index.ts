import { existsSync, globSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import type { Plugin } from 'rolldown';

const ELEMENT_ID = '@videojs/icons/element';
const FAMILY_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Serve HTML Icon families from their SVG sources during a bundler build. */
export interface IconElementPluginOptions {
  readonly cwd?: string | undefined;
}

export function iconElementPlugin(options: IconElementPluginOptions = {}): Plugin {
  const sourceRoot = resolve(import.meta.dirname, '../src/assets');
  const cwd =
    options.cwd ??
    (existsSync(sourceRoot) ? resolve(import.meta.dirname, '..') : resolve(import.meta.dirname, '../..'));

  return {
    name: 'videojs:icons:element',
    resolveId: {
      order: 'pre',
      filter: { id: new RegExp(`^${ELEMENT_ID}(?:/[^/]+)?$`) },
      handler(id) {
        return iconFamily(id) ? `\0${id}` : null;
      },
    },
    load: {
      filter: { id: new RegExp(`^\\0${ELEMENT_ID}(?:/[^/]+)?$`) },
      handler(id) {
        const family = iconFamily(id.slice(1));
        if (!family) return null;

        const familyRoot = resolve(cwd, 'src/assets', family);
        this.addWatchFile(familyRoot);
        const files = globSync(resolve(familyRoot, '*.svg')).sort();
        if (files.length === 0) throw new Error(`Icon family \`${family}\` does not contain any SVG assets.`);
        for (const file of files) this.addWatchFile(file);

        const icons = Object.fromEntries(files.map((file) => [basename(file, '.svg'), readFileSync(file, 'utf8')]));
        return elementModule(family, icons);
      },
    },
  };
}

function iconFamily(id: string): string | null {
  const family = id === ELEMENT_ID ? 'default' : id.startsWith(`${ELEMENT_ID}/`) ? id.slice(ELEMENT_ID.length + 1) : '';
  return FAMILY_NAME.test(family) ? family : null;
}

function elementModule(family: string, icons: Readonly<Record<string, string>>): string {
  return `
const family = ${JSON.stringify(family)};
const icons = ${JSON.stringify(icons)};

if (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') {
  let MediaIconElement = customElements.get('media-icon');

  if (!MediaIconElement) {
    MediaIconElement = class extends HTMLElement {
      static families = new Map();
      static register(name, values) {
        this.families.set(name, values);
        for (const element of document.querySelectorAll('media-icon')) element.render();
      }
      static get observedAttributes() { return ['name', 'family']; }
      connectedCallback() { this.render(); }
      attributeChangedCallback() { this.render(); }
      render() {
        const values = this.constructor.families.get(this.getAttribute('family') || 'default');
        const svg = values?.[this.getAttribute('name')];
        if (svg !== undefined && this.innerHTML !== svg) this.innerHTML = svg;
      }
    };

    customElements.define('media-icon', MediaIconElement);
  }

  MediaIconElement.register(family, icons);
}
`;
}
