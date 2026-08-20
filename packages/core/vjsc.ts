import { resolve } from 'node:path';

import { createSchemaModule } from 'vjsc';

export const coreSchemaSource = '@videojs/core/vjsc';

/** Build the canonical component schema in memory for compiler consumers. */
export function createCoreSchemaModule(output = resolve(import.meta.dirname, '.vjsc/virtual/core-schema.ts')) {
  return createSchemaModule(
    {
      source: coreSchemaSource,
      files: ['./src/core/ui/*/*-component.ts'],
      output,
    },
    { cwd: import.meta.dirname }
  );
}
