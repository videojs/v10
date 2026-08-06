import {
  type ComponentDefinition,
  type ComponentManifest,
  type ComponentRecord,
  type EmptyProps,
  hasParts,
  type InferProps,
} from './manifest';

export type { EmptyProps } from './manifest';

export const VIDEOJS_NODE = Symbol.for('@videojs/node');

export type ComponentType = Component<never> | typeof Fragment;

export interface ComponentNode {
  readonly [VIDEOJS_NODE]: true;
  readonly type: ComponentType;
  readonly props: Record<string, unknown>;
  readonly key: string | number | null;
}

export type ClassNameValue = string | false | null | undefined | readonly ClassNameValue[];

export interface BaseProps {
  className?: ClassNameValue;
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

type InferComponentNodeProps<Node> =
  Node extends ComponentDefinition<infer Props, ComponentRecord | undefined> ? Props : never;

type ComponentNodeProps<Node> = [NonNullable<InferComponentNodeProps<Node>>] extends [never]
  ? EmptyProps
  : NonNullable<InferComponentNodeProps<Node>>;

type CompoundComponent<Parts extends ComponentRecord> = {
  [K in keyof Parts & string]: Parts[K] extends ComponentDefinition<object, infer ChildParts>
    ? ChildParts extends ComponentRecord
      ? CompoundComponent<ChildParts>
      : Component<ComponentNodeProps<Parts[K]>>
    : Component<ComponentNodeProps<Parts[K]>>;
};

export type CreateComponentResult<M> =
  M extends ComponentDefinition<object, infer Parts>
    ? Parts extends ComponentRecord
      ? CompoundComponent<Parts>
      : Component<InferProps<M>>
    : Component<InferProps<M>>;

function createRuntimeComponentPart<Props extends object>(name: string, part: string | null): Component<Props> {
  const component = (_props: BaseProps & Props): ComponentNode => {
    throw new Error(`@videojs/jsx: <${name}${part ? `.${part}` : ''}> can only be evaluated by the compiler.`);
  };

  Object.assign(component, { $$component: { name, part } });

  return component as Component<Props>;
}

export const Slot = createRuntimeComponentPart<SlotProps>('Slot', null);

export function createComponent<Props extends object>(manifest: ComponentManifest<Props, undefined>): Component<Props>;
export function createComponent<const Parts extends ComponentRecord>(
  manifest: ComponentManifest<object, Parts>
): CompoundComponent<Parts>;
export function createComponent(manifest: ComponentManifest): Component<object> | Record<string, unknown> {
  if (!hasParts(manifest)) {
    return createRuntimeComponentPart(manifest.name, null);
  }

  return createComponentParts(manifest.name, manifest.parts);
}

function createComponentParts(name: string, parts: ComponentRecord, prefix = ''): Record<string, unknown> {
  const compound: Record<string, unknown> = {};

  for (const part of Object.keys(parts)) {
    const partPath = prefix ? `${prefix}.${part}` : part;
    const value = parts[part]!;

    compound[part] = hasParts(value)
      ? createComponentParts(name, value.parts, partPath)
      : createRuntimeComponentPart(name, partPath);
  }

  return compound;
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
