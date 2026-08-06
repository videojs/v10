declare const __PROPS_BRAND__: unique symbol;
declare const __EMPTY_PROPS__: unique symbol;

export type EmptyProps = {
  readonly [__EMPTY_PROPS__]?: never;
};

export interface ComponentDefinition<
  Props extends object = EmptyProps,
  Parts extends ComponentRecord | undefined = undefined,
> {
  name?: string | undefined;
  parts?: Parts | undefined;
  dataAttrs?: Record<string, string> | undefined;
  readonly [__PROPS_BRAND__]?: Props;
}

export type ComponentRecord = Record<string, ComponentDefinition<object, ComponentRecord | undefined>>;

export type ComponentManifest<
  Props extends object = object,
  Parts extends ComponentRecord | undefined = ComponentRecord | undefined,
> = ComponentDefinition<Props, Parts> & { name: string };

type ComponentOptions<Props extends object, Parts extends ComponentRecord | undefined> = Omit<
  ComponentDefinition<Props, Parts>,
  typeof __PROPS_BRAND__
>;

export function hasParts<Props extends object, Parts extends ComponentRecord>(
  component: ComponentDefinition<Props, Parts | undefined>
): component is ComponentDefinition<Props, Parts> & { parts: Parts } {
  return Boolean(component.parts);
}

export type InferProps<T> = T extends ComponentDefinition<infer Props, ComponentRecord | undefined> ? Props : never;

export type InferParts<T> = T extends ComponentDefinition<object, infer Parts> ? keyof NonNullable<Parts> : never;

export type InferPartProps<T, K extends string> =
  T extends ComponentDefinition<object, infer Parts>
    ? K extends keyof NonNullable<Parts>
      ? InferProps<NonNullable<Parts>[K]>
      : never
    : never;

export function defineComponent<Props extends object = EmptyProps>(): ComponentDefinition<Props>;
export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentRecord | undefined = undefined,
>(options: ComponentOptions<Props, Parts> & { name: string }): ComponentManifest<Props, Parts>;
export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentRecord | undefined = undefined,
>(options: ComponentOptions<Props, Parts>): ComponentDefinition<Props, Parts>;
export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentRecord | undefined = undefined,
>(options?: ComponentOptions<Props, Parts>): ComponentDefinition<Props, Parts> {
  return (options ?? {}) as ComponentDefinition<Props, Parts>;
}
