import { Fragment } from '../components/jsx-runtime';
import { REGISTRY_NODE, type RegistryElementType, type RegistryNode } from './definition';

export { Fragment };

function createNode(
  type: RegistryElementType,
  props: Record<string, unknown>,
  key?: string | number | null
): RegistryNode {
  return {
    [REGISTRY_NODE]: true,
    type,
    props,
    key: key ?? null,
  };
}

export function jsx(
  type: RegistryElementType,
  props: Record<string, unknown>,
  key?: string | number | null
): RegistryNode {
  return createNode(type, props, key);
}

export const jsxs = jsx;

export namespace JSX {
  export type Element = RegistryNode;
  export type ElementType = RegistryElementType;

  export interface ElementChildrenAttribute {
    children: Record<string, never>;
  }

  export interface IntrinsicAttributes {
    key?: string | number | undefined;
  }
}
