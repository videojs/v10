import type { Plugin } from 'rolldown';

import { createSchemaPlugin, type SchemaPluginOptions } from './plugin';

export type { SchemaPluginOptions } from './plugin';

/** Create a virtual component-schema entry directly inside a Rolldown config. */
export function schemaPlugin(config: SchemaPluginOptions): Plugin {
  return createSchemaPlugin(config, false);
}
