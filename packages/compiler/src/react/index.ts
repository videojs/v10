/**
 * React-target plugins for `@videojs/compiler`. Houses the framework-pattern
 * helpers that lower constrained JSX into React-friendly component shapes.
 * Re-exports `replace` and `wrap` for convenience so a config can import
 * everything from one subpath.
 */

export { type ReplaceOptions, replace } from '../transforms/replace';
export { type WrapOptions, wrap } from '../transforms/wrap';
export { type AddPropImportRef, type AddPropOptions, addProp } from './add-prop';
export { type ChildAsPropOptions, childAsProp } from './child-as-prop';
