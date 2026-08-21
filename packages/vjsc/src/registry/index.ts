export * from './definition';
export {
  type ComponentRegistryPluginOptions,
  type ComponentRegistryResolver,
  plugin as registryPlugin,
} from './plugin';
export {
  type ResolvedRegistryEntries,
  type ResolvedRegistryEntryTree,
  resolveRegistryEntries,
  type SchemaEntryContext,
  type SchemaEntryResolver,
} from './resolve';
