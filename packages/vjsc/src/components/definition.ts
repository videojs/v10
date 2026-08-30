declare const __PROPS_BRAND__: unique symbol;
declare const __EMPTY_PROPS__: unique symbol;

export type EmptyProps = {
  readonly [__EMPTY_PROPS__]?: never;
};

export interface ComponentDefinition<
  Props extends object = EmptyProps,
  Parts extends ComponentDefinitions | undefined = undefined,
> {
  name?: string | undefined;
  root?: Parts extends ComponentDefinitions ? keyof Parts & string : never;
  parts?: Parts | undefined;
  dataAttrs?: Record<string, string> | undefined;
  readonly [__PROPS_BRAND__]?: Props;
}

export type ComponentDefinitions = Record<string, ComponentDefinition<object, ComponentDefinitions | undefined>>;

export type NamedComponentDefinition<
  Props extends object = object,
  Parts extends ComponentDefinitions | undefined = ComponentDefinitions | undefined,
> = ComponentDefinition<Props, Parts> & { name: string };

export interface ComponentSchema<
  Definitions extends ComponentDefinitions = ComponentDefinitions,
  Source extends string = string,
> {
  readonly source: Source;
  readonly definitions: Definitions;
}

type ComponentOptions<Props extends object, Parts extends ComponentDefinitions | undefined> = Omit<
  ComponentDefinition<Props, Parts>,
  typeof __PROPS_BRAND__
>;

export function hasParts<Props extends object, Parts extends ComponentDefinitions>(
  component: ComponentDefinition<Props, Parts | undefined>
): component is ComponentDefinition<Props, Parts> & { parts: Parts } {
  return Boolean(component.parts);
}

export type InferProps<T> =
  T extends ComponentDefinition<infer Props, ComponentDefinitions | undefined> ? Props : never;

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
  const Parts extends ComponentDefinitions = ComponentDefinitions,
  const Root extends keyof Parts & string = keyof Parts & string,
>(
  options: Omit<ComponentOptions<Props, Parts>, 'root'> & { name: string; root: Root }
): NamedComponentDefinition<Props, Parts> & { readonly root: Root };

export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentDefinitions = ComponentDefinitions,
  const Root extends keyof Parts & string = keyof Parts & string,
>(
  options: Omit<ComponentOptions<Props, Parts>, 'root'> & { root: Root }
): ComponentDefinition<Props, Parts> & {
  readonly root: Root;
};

export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentDefinitions = ComponentDefinitions,
>(options: ComponentOptions<Props, Parts> & { name: string; parts: Parts }): NamedComponentDefinition<Props, Parts>;

export function defineComponent<Props extends object = EmptyProps>(
  options: ComponentOptions<Props, undefined> & { name: string }
): NamedComponentDefinition<Props, undefined>;

export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentDefinitions | undefined = undefined,
>(options: ComponentOptions<Props, Parts>): ComponentDefinition<Props, Parts>;

export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentDefinitions | undefined = undefined,
>(options?: ComponentOptions<Props, Parts>): ComponentDefinition<Props, Parts> {
  return (options ?? {}) as ComponentDefinition<Props, Parts>;
}

export function defineSchema<const Source extends string, const Definitions extends ComponentDefinitions>(
  source: Source,
  definitions: Definitions
): ComponentSchema<Definitions, Source> {
  return { source, definitions };
}
