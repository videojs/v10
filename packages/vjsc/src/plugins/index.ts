export type { Plugin, RolldownOutput } from 'rolldown';

export {
  type ComponentModuleMeta,
  componentMetaPlugin,
  readComponentMeta,
  readComponentModuleMeta,
  readComponentSource,
} from './component-meta';
export {
  type ComponentModuleContext,
  type ComponentModulesPluginOptions,
  componentModulesPlugin,
} from './component-modules';
export { type ComponentSchemaPluginOptions, componentSchemaPlugin } from './component-schema';
export { componentSourcePlugin } from './component-source';
export {
  type ComponentTargetModule,
  type ComponentTargetPluginOptions,
  type ComponentTargetSelection,
  componentTargetPlugin,
  primitiveTargetPlugin,
} from './component-target';
export { htmlRuntimePlugin } from './html-runtime';
export { reactTargetPropsPlugin } from './react-target-props';
export { type ShadcnPluginOptions, shadcnPlugin } from './shadcn';
export { type StyleModule, type StylePluginConfig, stylePlugin } from './style';
export { targetImportCleanupPlugin } from './target-import-cleanup';
export { targetJsxPlugin } from './target-jsx';
export { targetTypePlugin } from './target-type';
export { templateTargetPlugin } from './template-target';
