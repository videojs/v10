import type { ComponentManifest, InferPartProps, InferParts, InferProps } from './core/ui/manifest';

export const VIDEOJS_NODE = Symbol.for('@videojs/node');

declare const EMPTY_PROPS_SYMBOL: unique symbol;

type EmptyProps = {
  readonly [EMPTY_PROPS_SYMBOL]?: never;
};

export type ComponentType = string | Component<never> | typeof Fragment;

export interface ComponentNode {
  readonly [VIDEOJS_NODE]: true;
  readonly type: ComponentType;
  readonly props: Record<string, unknown>;
  readonly key: string | number | null;
}

export interface BaseProps {
  className?: string | undefined;
  children?: unknown;
}

export interface SlotProps {
  name?: string | undefined;
  children?: unknown;
}

export interface Component<Props extends object> {
  (props: BaseProps & Props): ComponentNode;
  readonly $$component: { name: string; part: string | null };
}

type PartComponentProps<M, K extends string> = K extends 'Root'
  ? InferProps<M>
  : [NonNullable<InferPartProps<M, K>>] extends [never]
    ? EmptyProps
    : NonNullable<InferPartProps<M, K>>;

type CompoundComponent<M> = {
  [K in InferParts<M> & string]: Component<PartComponentProps<M, K>>;
};

export type CreateComponentResult<M> = [InferParts<M>] extends [never]
  ? Component<InferProps<M>>
  : CompoundComponent<M>;

function createComponentPart<Props extends object>(name: string, part: string | null): Component<Props> {
  const fn = (_props: BaseProps & Props): ComponentNode => {
    throw new Error(`@videojs/core: <${name}${part ? `.${part}` : ''}> can only be evaluated by the compiler.`);
  };

  Object.assign(fn, { $$component: { name, part } });

  return fn as Component<Props>;
}

export const Slot = createComponentPart<SlotProps>('Slot', null);

export function createComponent<
  M extends ComponentManifest<object, readonly string[], Partial<Record<string, object>>>,
>(manifest: M): CreateComponentResult<M> {
  const parts = manifest.parts ?? [];

  if (parts.length === 0) {
    return createComponentPart(manifest.name, null) as CreateComponentResult<M>;
  }

  const compound: Record<string, Component<never>> = {};

  for (const part of parts) {
    compound[part] = createComponentPart(manifest.name, part);
  }

  return compound as CreateComponentResult<M>;
}

function createNode(type: ComponentType, props: Record<string, unknown>, key?: string | number | null): ComponentNode {
  return {
    [VIDEOJS_NODE]: true,
    type,
    props,
    key: key ?? null,
  };
}

export function jsx(type: ComponentType, props: Record<string, unknown>, key?: string | number | null): ComponentNode {
  return createNode(type, props, key);
}

export function jsxs(type: ComponentType, props: Record<string, unknown>, key?: string | number | null): ComponentNode {
  return createNode(type, props, key);
}

export const Fragment: unique symbol = Symbol.for('@videojs/fragment') as never;

export namespace JSX {
  export type Element = ComponentNode;

  export interface ElementChildrenAttribute {
    children: Record<string, never>;
  }

  export interface IntrinsicAttributes {
    key?: string | number | undefined;
  }

  export interface IntrinsicElements {
    readonly [intrinsicElement: string]: never;
  }
}
