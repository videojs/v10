export type {
  CallExpression,
  ImportDeclaration,
  JSXAttribute,
  JSXOpeningElement,
  Node,
  Program,
  VariableDeclaration,
  VariableDeclarator,
} from '@oxc-project/types';
export { walk } from 'oxc-walker';
export { type BlockBody, prependBlockBody } from './edit';
export {
  collectIdentifierNames,
  insertModuleImports,
  type ModuleImport,
  ModuleImports,
  type ModuleImportsOptions,
} from './imports';
export {
  createSourceText,
  type RenderedSourceRange,
  renderSourceRange,
  type SourceEdit,
  type SourceText,
  sliceSource,
} from './source';
export { collectFunctionDeclarations, findJsxAttribute, findJsxElement, jsxNamePath } from './traverse';
