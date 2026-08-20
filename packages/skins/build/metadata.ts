import { resolve } from 'node:path';

import type coreSchema from '@videojs/core/vjsc';
import { createSchemaModule } from 'vjsc';
import { type ComponentRegistry, extendRegistry } from 'vjsc/registry';
import createHtmlRegistry from '../../html/vjsc/registry';
import {
  createHtmlRegistry as createHtmlIconRegistry,
  createReactRegistry as createReactIconRegistry,
} from '../../icons/vjsc/registry';
import { createIconSchemaModule } from '../../icons/vjsc/schema';
import createReactRegistry from '../../react/vjsc/registry';

const packagesDir = resolve(import.meta.dirname, '../..');
const corePackageDir = resolve(packagesDir, 'core');
type CoreSchema = typeof coreSchema;

const frameworkRegistryWatchFiles = {
  html: [resolve(packagesDir, 'html/vjsc/registry.tsx'), resolve(packagesDir, 'html/vjsc/resolve.ts')],
  react: [resolve(packagesDir, 'react/vjsc/registry.tsx'), resolve(packagesDir, 'react/vjsc/resolve.ts')],
} as const;

export function getIconSchemaModule(family = 'default') {
  return createIconSchemaModule(family);
}

export function createReactComponentRegistry(iconFamily = 'default'): ComponentRegistry {
  const core = getCoreSchemaModule();
  const icons = getIconSchemaModule(iconFamily);

  return {
    ...extendRegistry(
      createReactRegistry(core.schema as CoreSchema),
      createReactIconRegistry(icons.schema, { family: iconFamily })
    ),
    watchFiles: [...core.watchFiles, ...icons.watchFiles, ...frameworkRegistryWatchFiles.react],
  };
}

export function createHtmlComponentRegistry(iconFamily = 'default'): ComponentRegistry {
  const core = getCoreSchemaModule();
  const icons = getIconSchemaModule(iconFamily);

  return {
    ...extendRegistry(
      createHtmlRegistry(core.schema as CoreSchema),
      createHtmlIconRegistry(icons.schema, { family: iconFamily })
    ),
    watchFiles: [...core.watchFiles, ...icons.watchFiles, ...frameworkRegistryWatchFiles.html],
  };
}

export function getCoreSchemaModule() {
  return createSchemaModule(
    {
      source: '@videojs/core/vjsc',
      files: ['./src/core/ui/*/*-component.ts'],
      output: resolve(corePackageDir, 'vjsc.ts'),
    },
    { cwd: corePackageDir }
  );
}
