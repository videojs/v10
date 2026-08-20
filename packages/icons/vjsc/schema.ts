import { resolve } from 'node:path';

import { createSchemaModule, type SchemaModule } from 'vjsc';
import { iconNames } from './icon-names';

const packageDir = resolve(import.meta.dirname, '..');

/** Read one icon-family schema directly from its source SVG assets. */
export function createIconSchemaModule(family = 'default'): SchemaModule {
  return createSchemaModule({
    cwd: packageDir,
    source: '@videojs/icons/vjsc',
    include: [
      {
        include: resolve(packageDir, `src/assets/${family}/*.svg`),
        name: (filename) => `${iconNames(filename).pascal}Icon`,
      },
    ],
    output: resolve(packageDir, 'vjsc.ts'),
  });
}
