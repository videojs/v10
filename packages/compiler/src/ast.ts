/**
 * Advanced TypeScript-AST primitives for compiler plugin authors.
 *
 * Most compiler configurations should use the high-level `transform()` DSL
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
  jsxExpression,
  type Matcher,
  propertyAccess,
  type ReplaceJsxChildOptions,
  type ReplaceOptions,
  readStringAttribute,
  replace,
  replaceJsxChild,
  tagName,
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
