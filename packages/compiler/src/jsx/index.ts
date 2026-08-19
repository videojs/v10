export { type CompilerTargetOptions, jsx } from '../config';
export type { ImportRef } from '../transforms/imports';
export {
  accessPath,
  findJsxAttribute,
  hasJsxAttribute,
  isJsxElementLike,
  type JsxPropReference,
  jsxAttributes,
  jsxExpression,
  propertyAccess,
  readAccessPath,
  readJsxAttributeExpression,
  readJsxProp,
  readStringAttribute,
  replaceJsxPropValue,
  singleJsxChildExpression,
  singleJsxElementChild,
  updateJsxAttributes,
} from '../utils/jsx';
export { createJsxEditor, type ExtractedJsxChild, type JsxElementEdit } from './editor';
export {
  moveJsxChildToProp,
  type ReplaceJsxElementChildrenOptions,
  type ReplaceJsxElementTagOptions,
  removeJsxAttribute,
  replaceJsxElementChildren,
  replaceJsxElementTag,
  type SetJsxAttributeOptions,
  setJsxAttribute,
} from './edits';
export { hasChild } from './matchers/has-child';
export { anyTag, byTag, type JsxElementLike, type Matcher, tagName } from './matchers/tag';
export { type AddPropImportRef, type AddPropOptions, addProp } from './transforms/add-prop';
export { type ChildAsPropOptions, childAsProp } from './transforms/child-as-prop';
export {
  type JsxChildReplacement,
  type ReplaceJsxChildOptions,
  replaceJsxChild,
} from './transforms/replace/child';
export { type ReplaceOptions, replace } from './transforms/replace/element';
export { type UnwrapOptions, unwrap } from './transforms/unwrap';
export { type WrapOptions, wrap } from './transforms/wrap';
