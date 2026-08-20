export {
  type BundleModules,
  type BundleModulesOptions,
  createBundleModules,
  defineVirtualModule,
  VIRTUAL_MODULE_PREFIX,
  type VirtualModuleDefinition,
} from './modules';
export {
  type VjscDeclarationOutput,
  type VjscPluginOptions,
  type VjscProjection,
  type VjscProjectionContext,
  type VjscTransformConfig,
  vjscPlugin,
} from './plugin';
export { type SchemaPlugin, type SchemaPluginOptions, schemaPlugin } from './schema';
export {
  defineVjscOutput,
  type VjscBuildOutput,
  type VjscModule,
  type VjscOutputAdapter,
  type VjscOutputFile,
  type VjscOutputFormatter,
} from './source';
