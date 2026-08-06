export { type JsxTargetOptions, jsx } from '../config';
export type { ImportRef } from '../transforms/imports';
export { hasChild } from './matchers/has-child';
export { anyTag, byTag, type JsxElementLike, type Matcher, tagName } from './matchers/tag';
export { type AddPropImportRef, type AddPropOptions, addProp } from './transforms/add-prop';
export { type ChildAsPropOptions, childAsProp } from './transforms/child-as-prop';
export {
  accessPath,
  type JsxChildReplacement,
  jsxExpression,
  propertyAccess,
  type ReplaceJsxChildOptions,
  readStringAttribute,
  replaceJsxChild,
} from './transforms/jsx';
export { type ReplaceOptions, replace } from './transforms/replace';
export { type WrapOptions, wrap } from './transforms/wrap';
