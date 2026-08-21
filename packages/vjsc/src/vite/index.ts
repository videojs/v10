import {
  componentMetaPlugin as createComponentMetaPlugin,
  componentTargetPlugin as createComponentTargetPlugin,
  editableSourcePlugin as createEditableSourcePlugin,
  htmlRuntimePlugin as createHtmlRuntimePlugin,
  primitiveTargetPlugin as createPrimitiveTargetPlugin,
  reactTargetPropsPlugin as createReactTargetPropsPlugin,
  schemaPlugin as createSchemaPlugin,
  shadcnPlugin as createShadcnPlugin,
  sourceModulesPlugin as createSourceModulesPlugin,
  stylePlugin as createStylePlugin,
  targetImportCleanupPlugin as createTargetImportCleanupPlugin,
  targetJsxPlugin as createTargetJsxPlugin,
  targetTypePlugin as createTargetTypePlugin,
  templateTargetPlugin as createTemplateTargetPlugin,
} from '../plugins';
import { withOxc } from './oxc';

export type {
  ComponentTargetModule,
  ComponentTargetPluginOptions,
  ComponentTargetSelection,
  SchemaPluginOptions,
  ShadcnPluginOptions,
  SourceModuleContext,
  SourceModulesPluginOptions,
  StyleModule,
  StylePluginConfig,
} from '../plugins';
export type { VitePlugin as Plugin } from './oxc';
export { viteOxcPlugin, withOxc } from './oxc';

export const componentMetaPlugin = withOxc(createComponentMetaPlugin);
export const componentTargetPlugin = withOxc(createComponentTargetPlugin);
export const editableSourcePlugin = withOxc(createEditableSourcePlugin);
export const htmlRuntimePlugin = withOxc(createHtmlRuntimePlugin);
export const primitiveTargetPlugin = withOxc(createPrimitiveTargetPlugin);
export const reactTargetPropsPlugin = withOxc(createReactTargetPropsPlugin);
export const schemaPlugin = withOxc(createSchemaPlugin);
export const shadcnPlugin = withOxc(createShadcnPlugin);
export const sourceModulesPlugin = withOxc(createSourceModulesPlugin);
export const stylePlugin = withOxc(createStylePlugin);
export const targetImportCleanupPlugin = withOxc(createTargetImportCleanupPlugin);
export const targetJsxPlugin = withOxc(createTargetJsxPlugin);
export const targetTypePlugin = withOxc(createTargetTypePlugin);
export const templateTargetPlugin = withOxc(createTemplateTargetPlugin);
