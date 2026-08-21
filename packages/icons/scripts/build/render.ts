import { join } from 'node:path';

import { DIST_DIR } from '../internal/paths.js';
import type { IconFamily } from './model.js';
import { writeOutput } from './output.js';

export function emitRenderFamily({ name: family, icons }: IconFamily): void {
  const entries = icons.map(({ name, svg }) => `  ${JSON.stringify(name)}: ${JSON.stringify(svg)}`).join(',\n');
  const names = icons.map(({ name }) => JSON.stringify(name)).join(' | ');
  const directory = join(DIST_DIR, 'render', family);

  writeOutput(
    join(directory, 'index.js'),
    [
      `const icons = {\n${entries},\n};`,
      ``,
      `function escapeAttribute(value) {`,
      `  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');`,
      `}`,
      ``,
      `export function renderIcon(name, attributes) {`,
      `  const svg = icons[name];`,
      `  if (!svg) return '';`,
      `  if (!attributes) return svg;`,
      `  const serialized = Object.entries(attributes)`,
      `    .map(([key, value]) => \` \${key}="\${escapeAttribute(value)}"\`)`,
      `    .join('');`,
      `  return svg.replace('<svg', \`<svg\${serialized}\`);`,
      `}`,
      ``,
    ].join('\n')
  );
  writeOutput(
    join(directory, 'index.d.ts'),
    [
      `export type IconName = ${names};`,
      ``,
      `export declare function renderIcon(`,
      `  name: IconName,`,
      `  attributes?: Record<string, string>,`,
      `): string;`,
      ``,
    ].join('\n')
  );
}
