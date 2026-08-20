import { resolve } from 'node:path';

import { createEntriesModule, type EntriesModule } from 'vjsc';
import type { ComponentSchema } from 'vjsc/components';
import { type ComponentRegistry, extendRegistry } from 'vjsc/registry';
import { createCoreSchemaModule } from '../../core/src/vjsc';
// @ts-expect-error Tooling executes package-owned registry source; project builds expose declarations only.
import { createRegistry as createHtmlRegistry, type HtmlRegistryEntries } from '../../html/vjsc/registry';
import { resolveHtmlEntries } from '../../html/vjsc/resolve';
import {
  createHtmlRegistry as createHtmlIconRegistry,
  createReactRegistry as createReactIconRegistry,
  // @ts-expect-error Tooling executes package-owned registry source; project builds expose declarations only.
} from '../../icons/vjsc/registry';
import { createIconSchemaModule } from '../../icons/vjsc/schema';
// @ts-expect-error Tooling executes package-owned registry source; project builds expose declarations only.
import { createRegistry as createReactRegistry, type ReactRegistryEntries } from '../../react/vjsc/registry';
import { resolveReactEntry } from '../../react/vjsc/resolve';

const packagesDir = resolve(import.meta.dirname, '../..');
const htmlDir = resolve(packagesDir, 'html');
const reactDir = resolve(packagesDir, 'react');

export function createReactEntriesModule(schema: ComponentSchema = createCoreSchemaModule().schema): EntriesModule {
  return createEntriesModule(
    {
      schema,
      output: './.vjsc/virtual/registry-react.ts',
      resolve: resolveReactEntry,
    },
    { cwd: reactDir }
  );
}

export function createHtmlEntriesModule(): EntriesModule {
  return createEntriesModule(
    {
      files: ['./src/define/{ui,media}/*.ts', './src/define/i18n.ts'],
      output: './.vjsc/virtual/registry-html.ts',
      resolve: resolveHtmlEntries,
    },
    { cwd: htmlDir }
  );
}

export function getIconSchemaModule(family = 'default') {
  return createIconSchemaModule(family);
}

export function createReactComponentRegistry(iconFamily = 'default'): ComponentRegistry {
  const schema = createCoreSchemaModule().schema;

  return extendRegistry(
    createReactRegistry(schema, createReactEntriesModule(schema).exports as ReactRegistryEntries),
    createReactIconRegistry(getIconSchemaModule(iconFamily).schema, { family: iconFamily })
  );
}

export function createHtmlComponentRegistry(iconFamily = 'default'): ComponentRegistry {
  const schema = createCoreSchemaModule().schema;

  return extendRegistry(
    createHtmlRegistry(schema, createHtmlEntriesModule().exports as HtmlRegistryEntries),
    createHtmlIconRegistry(getIconSchemaModule(iconFamily).schema, { family: iconFamily })
  );
}

export const coreSchemaModule = createCoreSchemaModule();
export const reactEntriesModule = createReactEntriesModule(coreSchemaModule.schema);
export const htmlEntriesModule = createHtmlEntriesModule();
