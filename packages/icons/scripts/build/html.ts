import { join } from 'node:path';

import { DIST_DIR } from '../internal/paths.js';
import type { IconFamily } from './model.js';
import { writeOutput } from './output.js';

export function emitHtmlFamily({ name: family, icons }: IconFamily): void {
  const directory = join(DIST_DIR, 'html', family);

  for (const { name, camelName, svg } of icons) {
    writeOutput(join(directory, `${name}.js`), `export const ${camelName}Icon = ${JSON.stringify(svg)};\n`);
    writeOutput(join(directory, `${name}.d.ts`), `export declare const ${camelName}Icon: string;\n`);
  }

  writeOutput(
    join(directory, 'index.js'),
    `${icons.map(({ name, camelName }) => `export { ${camelName}Icon } from './${name}.js';`).join('\n')}\n`
  );
  writeOutput(
    join(directory, 'index.d.ts'),
    `${icons.map(({ camelName }) => `export declare const ${camelName}Icon: string;`).join('\n')}\n`
  );
}
