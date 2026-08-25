import {
  type ComponentDefinition,
  type ComponentManifest,
  type ComponentRecord,
  type EmptyProps,
  hasParts,
  type InferProps,
} from './definition';

export type { EmptyProps } from './definition';

export const VIDEOJS_NODE = Symbol.for('@videojs/node');

export type ComponentType = Component<never> | typeof Fragment;

/** One canonical JSX element produced by the VJSC authoring runtime. */
export interface VjscElement {
  readonly [VIDEOJS_NODE]: true;
  readonly type: ComponentType;
  readonly props: Record<string, unknown>;
  readonly key: string | number | null;
}

/** Framework-neutral content accepted by a component child or named content slot. */
export type VjscNode = unknown;

type ClassNamePart = string | false | null | undefined;

/** Static class-name values accepted while authoring canonical components. */
export type ClassNameValue = ClassNamePart | readonly ClassNameValue[];

export interface BaseProps {
  className?: ClassNameValue;
  children?: unknown;
}

export type Props<CoreProps extends object = EmptyProps> = CoreProps & Pick<BaseProps, 'className'>;

export type PropsWithChildren<CoreProps extends object = EmptyProps> = Props<CoreProps> & Pick<BaseProps, 'children'>;

/** Props accepted by another VJSC component. Targets replace this with their public props export. */
export type PropsOf<Component extends (props: never) => unknown> = NonNullable<Parameters<Component>[0]>;

type ComponentAttributes<Props extends object> = Omit<PropsWithChildren<Props>, 'className'> & {
  className?: ClassNameValue;
};

export interface SlotProps {
  name?: string | undefined;
  children?: unknown;
}

export interface TemplateProps extends BaseProps {
  /** Static source key identifying this repeated subtree within its containing component. */
  name: string;
}

export interface TemplatePartProps extends BaseProps {
  /** Static source key identifying this value outlet within its containing template or component. */
  name: string;
}

export interface TextProps extends BaseProps {
  /** Translation key used by framework targets when the children provide fallback text. */
  token?: string | undefined;
  /** Optional data-part marker consumed by generated component behavior. */
  'data-part'?: string | undefined;
}

export type BoxProps = BaseProps;

export interface Component<Props extends object> {
  (props: ComponentAttributes<Props>): VjscElement;
  readonly $$component: { name: string; part: string | null };
}

type InferComponentProps<Node> =
  Node extends ComponentDefinition<infer Props, ComponentRecord | undefined> ? Props : never;

type ResolvedComponentProps<Node> = [NonNullable<InferComponentProps<Node>>] extends [never]
  ? EmptyProps
  : NonNullable<InferComponentProps<Node>>;

type CompoundComponent<Parts extends ComponentRecord> = {
  [K in keyof Parts & string]: Parts[K] extends ComponentDefinition<object, infer ChildParts>
    ? ChildParts extends ComponentRecord
      ? CompoundComponent<ChildParts>
      : Component<ResolvedComponentProps<Parts[K]>>
    : Component<ResolvedComponentProps<Parts[K]>>;
};

export type CreateComponentResult<M> =
  M extends ComponentDefinition<object, infer Parts>
    ? Parts extends ComponentRecord
      ? CompoundComponent<Parts>
      : Component<InferProps<M>>
    : Component<InferProps<M>>;

function createRuntimeComponentPart<Props extends object>(name: string, part: string | null): Component<Props> {
  const component = (_props: ComponentAttributes<Props>): VjscElement => {
    throw new Error(`vjsc/components: <${name}${part ? `.${part}` : ''}> can only be evaluated by a VJSC transform.`);
  };

  Object.assign(component, { $$component: { name, part } });

  return component as Component<Props>;
}

export const Slot = createRuntimeComponentPart<SlotProps>('Slot', null);
export const Box = createRuntimeComponentPart<BoxProps>('Box', null);
export const Template = Object.assign(createRuntimeComponentPart<TemplateProps>('Template', null), {
  Part: createRuntimeComponentPart<TemplatePartProps>('Template', 'Part'),
});
export const Text = createRuntimeComponentPart<TextProps>('Text', null);

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

function createNode(type: ComponentType, props: Record<string, unknown>, key?: string | number | null): VjscElement {
  return {
    [VIDEOJS_NODE]: true,
    type,
    props,
    key: key ?? null,
  };
}

export function jsx(type: ComponentType, props: Record<string, unknown>, key?: string | number | null): VjscElement {
  return createNode(type, props, key);
}

export function jsxs(type: ComponentType, props: Record<string, unknown>, key?: string | number | null): VjscElement {
  return createNode(type, props, key);
}

export const Fragment: unique symbol = Symbol.for('@videojs/fragment') as never;

export namespace JSX {
  export type Element = VjscElement;

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
