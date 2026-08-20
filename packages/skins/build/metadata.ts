import { resolve } from 'node:path';

import { createEntriesModule, createSchemaModule } from 'vjsc';
import { type ComponentRegistry, extendRegistry } from 'vjsc/registry';
import { createCoreSchemaModule } from '../../core/vjsc';
import { createRegistry as createHtmlRegistry, type HtmlRegistryEntries } from '../../html/vjsc/registry';
import { resolveHtmlEntries } from '../../html/vjsc/resolve';
import { iconNames } from '../../icons/scripts/internal/icon-names';
import {
  createHtmlRegistry as createHtmlIconRegistry,
  createReactRegistry as createReactIconRegistry,
} from '../../icons/vjsc/registry';
import { createRegistry as createReactRegistry, type ReactRegistryEntries } from '../../react/vjsc/registry';
import { resolveReactEntry } from '../../react/vjsc/resolve';

const packagesDir = resolve(import.meta.dirname, '../..');
const htmlDir = resolve(packagesDir, 'html');
const iconsDir = resolve(packagesDir, 'icons');
const reactDir = resolve(packagesDir, 'react');

export function createReactEntriesModule(schema = createCoreSchemaModule().schema) {
  return createEntriesModule(
    {
      schema,
      output: './.vjsc/virtual/registry-react.ts',
      resolve: resolveReactEntry,
    },
    { cwd: reactDir }
  );
}

export function createHtmlEntriesModule() {
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
  return createSchemaModule(
    {
      source: '@videojs/icons/vjsc',
      files: [
        {
          files: resolve(iconsDir, `src/assets/${family}/*.svg`),
          name: (filename) => `${iconNames(filename).pascal}Icon`,
        },
      ],
      output: './.vjsc/virtual/icons-schema.ts',
    },
    { cwd: iconsDir }
  );
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
