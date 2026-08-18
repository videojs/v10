/**
 * Advanced TypeScript-AST primitives for compiler plugin authors.
 *
 * Most compiler configurations should use the high-level `rewrite()` DSL
 * from `@videojs/compiler`. This subpath is the explicit escape hatch for
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
  hasChild,
  type JsxChildReplacement,
  type JsxElementLike,
  type JsxPropReference,
  jsxAttributes,
  jsxExpression,
  type Matcher,
  propertyAccess,
  type ReplaceJsxChildOptions,
  type ReplaceOptions,
  readAccessPath,
  readJsxAttributeExpression,
  readJsxProp,
  readStringAttribute,
  replace,
  replaceJsxChild,
  replaceJsxPropValue,
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
  dropUnusedImports,
  dropUnusedLocals,
  type ImportRef,
  type ImportRewriteOptions,
  type ImportRule,
  resolveRelative,
  transformImports,
} from './transforms';
export {
  createIndexedAccessType,
  createInterfaceDeclaration,
  createLiteralType,
  createNamedType,
  type InterfaceDeclarationOptions,
  type InterfacePropertySpec,
} from './utils/declarations';
export { collectModuleReferences, type ModuleReference } from './utils/module-references';
export {
  collectModuleSpecifiers,
  type RewriteModuleSpecifiersOptions,
  rewriteModuleSpecifiers,
} from './utils/module-specifiers';
export { collectReferencedIdentifiers } from './utils/references';
