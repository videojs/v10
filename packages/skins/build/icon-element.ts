import { globSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import type { VjscModule } from 'vjsc/bundle';

/** Generate the browser registration module for one HTML icon family. */
export function createIconElementModule(family: string, options: { cwd?: string } = {}): VjscModule {
  const cwd = options.cwd ?? resolve(import.meta.dirname, '../../icons');
  const files = globSync(resolve(cwd, `src/assets/${family}/*.svg`)).sort();
  if (files.length === 0) throw new Error(`Icon family \`${family}\` does not contain any SVG assets.`);

  const icons = Object.fromEntries(files.map((file) => [basename(file, '.svg'), readFileSync(file, 'utf8')]));

  return {
    code: `
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
`,
    watchFiles: files,
  };
}
