import {
  componentMetaPlugin as createComponentMetaPlugin,
  componentModulesPlugin as createComponentModulesPlugin,
  componentSchemaPlugin as createComponentSchemaPlugin,
  componentSourcePlugin as createComponentSourcePlugin,
  componentTargetPlugin as createComponentTargetPlugin,
  htmlRuntimePlugin as createHtmlRuntimePlugin,
  primitiveTargetPlugin as createPrimitiveTargetPlugin,
  reactTargetPropsPlugin as createReactTargetPropsPlugin,
  shadcnPlugin as createShadcnPlugin,
  stylePlugin as createStylePlugin,
  targetImportCleanupPlugin as createTargetImportCleanupPlugin,
  targetJsxPlugin as createTargetJsxPlugin,
  targetTypePlugin as createTargetTypePlugin,
  templateTargetPlugin as createTemplateTargetPlugin,
} from '../plugins';
import { withOxc } from './oxc';

export type {
  ComponentModuleContext,
  ComponentModulesPluginOptions,
  ComponentSchemaPluginOptions,
  ComponentTargetModule,
  ComponentTargetPluginOptions,
  ComponentTargetSelection,
  ShadcnPluginOptions,
  StyleModule,
  StylePluginConfig,
} from '../plugins';
export type { VitePlugin as Plugin } from './oxc';
export { viteOxcPlugin, withOxc } from './oxc';

export const componentMetaPlugin = withOxc(createComponentMetaPlugin);
export const componentModulesPlugin = withOxc(createComponentModulesPlugin);
export const componentSchemaPlugin = withOxc(createComponentSchemaPlugin);
export const componentSourcePlugin = withOxc(createComponentSourcePlugin);
export const componentTargetPlugin = withOxc(createComponentTargetPlugin);
export const htmlRuntimePlugin = withOxc(createHtmlRuntimePlugin);
export const primitiveTargetPlugin = withOxc(createPrimitiveTargetPlugin);
export const reactTargetPropsPlugin = withOxc(createReactTargetPropsPlugin);
export const shadcnPlugin = withOxc(createShadcnPlugin);
export const stylePlugin = withOxc(createStylePlugin);
export const targetImportCleanupPlugin = withOxc(createTargetImportCleanupPlugin);
export const targetJsxPlugin = withOxc(createTargetJsxPlugin);
export const targetTypePlugin = withOxc(createTargetTypePlugin);
export const templateTargetPlugin = withOxc(createTemplateTargetPlugin);
