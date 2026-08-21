export type { Plugin, RolldownOutput } from 'rolldown';

export { componentMetaPlugin } from './component-meta';
export {
  type ComponentTargetModule,
  type ComponentTargetPluginOptions,
  type ComponentTargetSelection,
  componentTargetPlugin,
  primitiveTargetPlugin,
} from './component-target';
export { editableSourcePlugin } from './editable-source';
export { htmlRuntimePlugin } from './html-runtime';
export { readVjscMeta, readVjscSource, type VjscModuleMeta } from './meta';
export { reactTargetPropsPlugin } from './react-target-props';
export { type SchemaPluginOptions, schemaPlugin } from './schema';
export { type ShadcnPluginOptions, shadcnPlugin } from './shadcn';
export {
  type SourceModuleContext,
  type SourceModulesPluginOptions,
  sourceModulesPlugin,
} from './source-modules';
export { type StyleModule, type StylePluginConfig, stylePlugin } from './style';
export { targetImportCleanupPlugin } from './target-import-cleanup';
export { targetJsxPlugin } from './target-jsx';
export { targetTypePlugin } from './target-type';
export { templateTargetPlugin } from './template-target';
