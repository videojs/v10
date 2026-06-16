import type { ComponentManifest, InferPartProps, InferParts, InferProps } from './define-component';

export const VIDEOJS_NODE = Symbol.for('@videojs/node');

export interface ComponentNode {
  readonly [VIDEOJS_NODE]: true;
  readonly type: unknown;
  readonly props: Record<string, unknown>;
  readonly key: string | number | null;
}

export interface BaseProps {
  className?: string | undefined;
  children?: unknown;
}

export interface Component<Props> {
  (props: BaseProps & Props): unknown;
  readonly $$component: { name: string; part: string | null };
}

type PartComponentProps<M, K extends string> = K extends 'Root'
  ? InferProps<M>
  : InferPartProps<M, K> extends never
    ? unknown
    : InferPartProps<M, K>;

type CompoundComponent<M> = {
  [K in InferParts<M> & string]: Component<PartComponentProps<M, K>>;
};

export type CreateComponentResult<M> = [InferParts<M>] extends [never]
  ? Component<InferProps<M>>
  : CompoundComponent<M>;

function makePart<Props>(name: string, part: string | null): Component<Props> {
  const fn = (_props: BaseProps & Props): unknown => {
    throw new Error(`@videojs/compiler: <${name}${part ? `.${part}` : ''}> can only be evaluated by the compiler.`);
  };

  Object.assign(fn, { $$component: { name, part } });

  return fn as Component<Props>;
}

export function createComponent<M extends ComponentManifest<unknown, readonly string[], Record<string, unknown>>>(
  manifest: M
): CreateComponentResult<M> {
  const parts = manifest.parts ?? [];

  if (parts.length === 0) {
    return makePart(manifest.name, null) as CreateComponentResult<M>;
  }

  const compound: Record<string, Component<unknown>> = {};

  for (const part of parts) {
    compound[part] = makePart(manifest.name, part);
  }

  return compound as CreateComponentResult<M>;
}

function createNode(type: unknown, props: Record<string, unknown>, key?: string | number | null): ComponentNode {
  return {
    [VIDEOJS_NODE]: true,
    type,
    props,
    key: key ?? null,
  };
}

export function jsx(type: unknown, props: Record<string, unknown>, key?: string | number | null): ComponentNode {
  return createNode(type, props, key);
}

export function jsxs(type: unknown, props: Record<string, unknown>, key?: string | number | null): ComponentNode {
  return createNode(type, props, key);
}

export const Fragment: unique symbol = Symbol.for('@videojs/fragment') as never;

export namespace JSX {
  export type Element = unknown;

  export interface ElementChildrenAttribute {
    children: Record<string, never>;
  }

  export interface IntrinsicAttributes {
    key?: string | number | undefined;
  }

  export interface IntrinsicElements {
    div: BaseProps;
    span: BaseProps;
  }
}
