/**
 * Advanced TypeScript-AST primitives for compiler plugin authors.
 *
 * Most compiler configurations should use the high-level `rewrite()` DSL
 * from `vjsc`. This subpath is the explicit escape hatch for
 * transforms that need direct access to TypeScript nodes and factories.
 */
export type { CompilerTransform } from './config';
export {
  type AddPropImportRef,
  type AddPropOptions,
  accessPath,
  addProp,
  anyTag,
  byTag,
  type ChildAsPropOptions,
  childAsProp,
  createJsxEditor,
  type ExtractedJsxChild,
  findJsxAttribute,
  hasChild,
  hasJsxAttribute,
  isJsxElementLike,
  type JsxChildReplacement,
  type JsxElementEdit,
  type JsxElementLike,
  type JsxPropReference,
  jsxAttributes,
  jsxExpression,
  type Matcher,
  moveJsxChildToProp,
  propertyAccess,
  type ReplaceJsxChildOptions,
  type ReplaceJsxElementChildrenOptions,
  type ReplaceJsxElementTagOptions,
  type ReplaceOptions,
  readAccessPath,
  readJsxAttributeExpression,
  readJsxProp,
  readStringAttribute,
  removeJsxAttribute,
  replace,
  replaceJsxChild,
  replaceJsxElementChildren,
  replaceJsxElementTag,
  replaceJsxPropValue,
  type SetJsxAttributeOptions,
  setJsxAttribute,
  singleJsxChildExpression,
  singleJsxElementChild,
  tagName,
  type UnwrapOptions,
  unwrap,
  updateJsxAttributes,
  type WrapOptions,
  wrap,
} from './jsx';
export { type ParseOptions, type ParseResult, parse } from './parse';
export {
  type AddImportContext,
  type AddImportRef,
  addNamedImport,
  addSideEffectImport,
  dropUnusedImports,
  dropUnusedLocals,
  type ImportRef,
  type ImportRewriteOptions,
  type ImportRule,
  rebaseImportSpecifier,
  transformImports,
} from './transforms';
export {
  collectClassDeclarations,
  findClassDeclaration,
  readStaticStringProperty,
} from './utils/classes';
export {
  createIndexedAccessType,
  createInterfaceDeclaration,
  createLiteralType,
  createNamedType,
  type InterfaceDeclarationOptions,
  type InterfacePropertySpec,
} from './utils/declarations';
export { createArrowFunction } from './utils/functions';
export { collectModuleReferences, type ModuleReference } from './utils/module-references';
export {
  collectModuleSpecifiers,
  type RewriteModuleSpecifiersOptions,
  rewriteModuleSpecifiers,
} from './utils/module-specifiers';
export { collectReferencedIdentifiers } from './utils/references';
