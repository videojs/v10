import { resolve } from 'node:path';

import { createSchemaModule } from 'vjsc';

const packageDir = resolve(import.meta.dirname, '..');

export const coreSchemaSource = '@videojs/core/vjsc';

/** Build the canonical component schema in memory for compiler consumers. */
export function createCoreSchemaModule(output = resolve(packageDir, '.vjsc/virtual/core-schema.ts')) {
  return createSchemaModule(
    {
      source: coreSchemaSource,
      files: ['./src/core/ui/*/*-component.ts'],
      output,
    },
    { cwd: packageDir }
  );
}
