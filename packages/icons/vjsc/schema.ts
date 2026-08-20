import { resolve } from 'node:path';

import { createSchemaModule, type SchemaModule } from 'vjsc';
import { iconNames } from './icon-names';

const packageDir = resolve(import.meta.dirname, '..');

/** Build one canonical icon-family schema in memory for compiler consumers. */
export function createIconSchemaModule(family = 'default'): SchemaModule {
  return createSchemaModule(
    {
      source: '@videojs/icons/vjsc',
      files: [
        {
          files: resolve(packageDir, `src/assets/${family}/*.svg`),
          name: (filename) => `${iconNames(filename).pascal}Icon`,
        },
      ],
      output: './.vjsc/virtual/icons-schema.ts',
    },
    { cwd: packageDir }
  );
}
