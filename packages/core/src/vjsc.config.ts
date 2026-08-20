import { resolve } from 'node:path';

import { schemaVirtualModule } from 'vjsc';

export const coreSchemaSource = '@videojs/core/vjsc';

/** Canonical Core component schema shared by tsdown and Vite compiler graphs. */
export const coreSchemaModule = schemaVirtualModule(
  {
    id: 'virtual:vjsc/core-schema',
    source: coreSchemaSource,
    files: ['./src/core/ui/*/*-component.ts'],
    fileName: './.vjsc/virtual/core-schema.ts',
  },
  { cwd: resolve(import.meta.dirname, '..') }
);
