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

export const coreSchemaModule = createCoreSchemaModule();

export const reactEntriesModule = createEntriesModule(
  {
    schema: coreSchemaModule.schema,
    output: './vjsc/entries.generated.ts',
    resolve: resolveReactEntry,
  },
  { cwd: reactDir }
);

export const htmlEntriesModule = createEntriesModule(
  {
    files: ['./src/define/{ui,media}/*.ts', './src/define/i18n.ts'],
    output: './vjsc/entries.generated.ts',
    resolve: resolveHtmlEntries,
  },
  { cwd: htmlDir }
);

const iconSchemas = new Map<string, ReturnType<typeof createSchemaModule>>();

export function getIconSchemaModule(family = 'default') {
  let schema = iconSchemas.get(family);
  if (!schema) {
    schema = createSchemaModule(
      {
        source: '@videojs/icons/vjsc',
        files: [
          {
            files: resolve(iconsDir, `src/assets/${family}/*.svg`),
            name: (filename) => `${iconNames(filename).pascal}Icon`,
          },
        ],
        output: './vjsc/schema.generated.ts',
      },
      { cwd: iconsDir }
    );
    iconSchemas.set(family, schema);
  }
  return schema;
}

export function createReactComponentRegistry(iconFamily = 'default'): ComponentRegistry {
  return extendRegistry(
    createReactRegistry(coreSchemaModule.schema, reactEntriesModule.exports as ReactRegistryEntries),
    createReactIconRegistry(getIconSchemaModule(iconFamily).schema, { family: iconFamily })
  );
}

export function createHtmlComponentRegistry(iconFamily = 'default'): ComponentRegistry {
  return extendRegistry(
    createHtmlRegistry(coreSchemaModule.schema, htmlEntriesModule.exports as HtmlRegistryEntries),
    createHtmlIconRegistry(getIconSchemaModule(iconFamily).schema, { family: iconFamily })
  );
}
