import {
  TARGET_FRAGMENT,
  TARGET_HOST,
  TARGET_NODE,
  type TargetElement,
  type TargetElementType,
  type TargetNode,
} from './definition';

export const Fragment = TARGET_FRAGMENT;
export const Host =
  // SAFETY: JSX passes component values to `jsx`; it never invokes this host sentinel as a function.
  TARGET_HOST as typeof TARGET_HOST & TargetElement;

export function jsx(type: TargetElementType, props: Record<string, unknown>, key?: string | number | null): TargetNode {
  return {
    [TARGET_NODE]: true,
    type,
    props,
    key: key ?? null,
  };
}

export const jsxs = jsx;

export namespace JSX {
  export type Element = TargetNode;
  export type ElementType = TargetElementType;

  export interface ElementChildrenAttribute {
    children: Record<string, never>;
  }

  export interface IntrinsicAttributes {
    key?: string | number | undefined;
  }
}
