import { resolve } from 'node:path';

import { schemaVirtualModule, type VirtualSchemaModule } from 'vjsc';
import { iconNames } from './icon-names';

const packageDir = resolve(import.meta.dirname, '..');

/** Expose one canonical icon-family schema through the shared bundler graph. */
export function iconSchemaVirtualModule(family = 'default'): VirtualSchemaModule {
  return schemaVirtualModule(
    {
      id: family === 'default' ? 'virtual:vjsc/icons-schema' : `virtual:vjsc/icons-schema/${family}`,
      source: '@videojs/icons/vjsc',
      files: [
        {
          files: resolve(packageDir, `src/assets/${family}/*.svg`),
          name: (filename) => `${iconNames(filename).pascal}Icon`,
        },
      ],
      fileName: `./.vjsc/virtual/icons-schema-${family}.ts`,
    },
    { cwd: packageDir }
  );
}
