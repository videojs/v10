import type { Plugin } from 'rolldown';

import { createSchemaPlugin, type SchemaPluginOptions } from './plugin';

export interface SchemaTsdownPluginOptions extends SchemaPluginOptions {
  readonly declaration?: boolean | undefined;
}

/** Create component-schema JavaScript and declaration entries in a tsdown build. */
export function schemaPlugin(config: SchemaTsdownPluginOptions): Plugin {
  return createSchemaPlugin(config, config.declaration ?? false);
}
