import { resolve } from 'node:path';

import type coreSchema from '@videojs/core/vjsc';
import { createSchemaModule } from 'vjsc';
import { type ComponentRegistry, extendRegistry } from 'vjsc/registry';
import {
  createHtmlRegistry as createHtmlIconRegistry,
  createReactRegistry as createReactIconRegistry,
} from '../../../icons/vjsc/registry';
import { createIconSchemaModule } from '../../../icons/vjsc/schema';
import createHtmlRegistry from './html';
import createReactRegistry from './react';

const packagesDir = resolve(import.meta.dirname, '../../..');
const corePackageDir = resolve(packagesDir, 'core');
type CoreSchema = typeof coreSchema;

export function createReactComponentRegistry(iconFamily = 'default'): ComponentRegistry {
  const core = getCoreSchemaModule();
  const icons = getIconSchemaModule(iconFamily);

  return {
    ...extendRegistry(
      createReactRegistry(core.schema as CoreSchema),
      createReactIconRegistry(icons.schema, { family: iconFamily })
    ),
    watchFiles: [...core.watchFiles, ...icons.watchFiles],
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
    watchFiles: [...core.watchFiles, ...icons.watchFiles],
  };
}

export function getCoreSchemaModule() {
  return createSchemaModule({
    cwd: corePackageDir,
    source: '@videojs/core/vjsc',
    include: ['./src/core/ui/*/*-component.ts'],
    output: resolve(corePackageDir, 'vjsc.ts'),
  });
}

export function getIconSchemaModule(family = 'default') {
  return createIconSchemaModule(family);
}
