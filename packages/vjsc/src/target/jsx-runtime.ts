import { TARGET_FRAGMENT, TARGET_HOST, TARGET_NODE, type TargetElementType, type TargetNode } from './definition';

export const Fragment = TARGET_FRAGMENT;
export const Host: typeof TARGET_HOST = TARGET_HOST;

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
