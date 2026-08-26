import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { transformSync } from 'oxc-transform';

import { DIST_DIR } from '../internal/paths.js';
import type { IconFamily } from './model.js';
import { writeOutput } from './output.js';

const elementSource = join(import.meta.dirname, '../../src/element.ts');

function registration(family: string): string {
  return [
    `import { MediaIconElement } from '../base.js';`,
    `import { icons } from './icons.js';`,
    ``,
    `if (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') {`,
    `  const mediaIconElement = customElements.get('media-icon') || MediaIconElement;`,
    `  mediaIconElement.register?.(${JSON.stringify(family)}, icons);`,
    `  if (!customElements.get('media-icon')) customElements.define('media-icon', MediaIconElement);`,
    `}`,
    ``,
  ].join('\n');
}

export function emitElementBase(families: readonly IconFamily[]): void {
  const result = transformSync(elementSource, readFileSync(elementSource, 'utf8'), {
    lang: 'ts',
    sourceType: 'module',
  });

  if (result.errors.length > 0 || !result.code) {
    const errors = result.errors.map((error) => error.codeframe ?? error.message).join('\n');

    throw new Error(`Could not transpile MediaIconElement:\n${errors}`);
  }

  writeOutput(join(DIST_DIR, 'element', 'base.js'), result.code);
  writeOutput(
    join(DIST_DIR, 'element', 'index.js'),
    [
      `import { MediaIconElement } from './base.js';`,
      ``,
      `if (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') {`,
      `  const mediaIconElement = customElements.get('media-icon') || MediaIconElement;`,
      ...families.map(
        ({ name }) =>
          `  mediaIconElement.registerLoader?.(${JSON.stringify(name)}, () => import('./${name}/icons.js').then(({ icons }) => icons));`
      ),
      `  if (!customElements.get('media-icon')) customElements.define('media-icon', MediaIconElement);`,
      `}`,
      ``,
    ].join('\n')
  );
  writeOutput(join(DIST_DIR, 'element', 'index.d.ts'), `export {};\n`);
}

export function emitElementFamily({ name: family, icons }: IconFamily): void {
  const entries = icons.map(({ name, svg }) => `  ${JSON.stringify(name)}: ${JSON.stringify(svg)}`).join(',\n');
  const directory = join(DIST_DIR, 'element', family);

  writeOutput(join(directory, 'icons.js'), `export const icons = {\n${entries},\n};\n`);
  writeOutput(join(directory, 'icons.d.ts'), `export declare const icons: Readonly<Record<string, string>>;\n`);
  writeOutput(join(directory, 'index.js'), registration(family));
  writeOutput(join(directory, 'index.d.ts'), `export {};\n`);
}
