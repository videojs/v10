export { type CompilerTargetOptions, jsx } from '../config';
export type { ImportRef } from '../transforms/imports';
export {
  accessPath,
  type JsxPropReference,
  jsxAttributes,
  jsxExpression,
  propertyAccess,
  readAccessPath,
  readJsxAttributeExpression,
  readJsxProp,
  readStringAttribute,
  replaceJsxPropValue,
  singleJsxElementChild,
  updateJsxAttributes,
} from '../utils/jsx';
export { hasChild } from './matchers/has-child';
export { anyTag, byTag, type JsxElementLike, type Matcher, tagName } from './matchers/tag';
export { type AddPropImportRef, type AddPropOptions, addProp } from './transforms/add-prop';
export { type ChildAsPropOptions, childAsProp } from './transforms/child-as-prop';
export { type ReplaceOptions, replace } from './transforms/replace';
export {
  type JsxChildReplacement,
  type ReplaceJsxChildOptions,
  replaceJsxChild,
} from './transforms/replace-jsx-child';
export { type UnwrapOptions, unwrap } from './transforms/unwrap';
export { type WrapOptions, wrap } from './transforms/wrap';
