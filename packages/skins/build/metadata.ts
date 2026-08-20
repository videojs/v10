import { resolve } from 'node:path';

import type { schema as coreSchema } from '@videojs/core/vjsc';
import { type ComponentRegistry, extendRegistry } from 'vjsc/registry';
import { createCoreSchemaModule } from '../../core/src/vjsc';
import { createRegistry as createHtmlRegistry } from '../../html/vjsc/registry';
import {
  createHtmlRegistry as createHtmlIconRegistry,
  createReactRegistry as createReactIconRegistry,
} from '../../icons/vjsc/registry';
import { createIconSchemaModule } from '../../icons/vjsc/schema';
import { createRegistry as createReactRegistry } from '../../react/vjsc/registry';

const packagesDir = resolve(import.meta.dirname, '../..');
type CoreSchema = typeof coreSchema;

export const frameworkRegistryWatchFiles = {
  html: [resolve(packagesDir, 'html/vjsc/registry.tsx'), resolve(packagesDir, 'html/vjsc/resolve.ts')],
  react: [resolve(packagesDir, 'react/vjsc/registry.tsx'), resolve(packagesDir, 'react/vjsc/resolve.ts')],
} as const;

export function getIconSchemaModule(family = 'default') {
  return createIconSchemaModule(family);
}

export function createReactComponentRegistry(iconFamily = 'default'): ComponentRegistry {
  const schema = createCoreSchemaModule().schema as CoreSchema;

  return extendRegistry(
    createReactRegistry(schema),
    createReactIconRegistry(getIconSchemaModule(iconFamily).schema, { family: iconFamily })
  );
}

export function createHtmlComponentRegistry(iconFamily = 'default'): ComponentRegistry {
  const schema = createCoreSchemaModule().schema as CoreSchema;

  return extendRegistry(
    createHtmlRegistry(schema),
    createHtmlIconRegistry(getIconSchemaModule(iconFamily).schema, { family: iconFamily })
  );
}

export const coreSchemaModule = createCoreSchemaModule();
