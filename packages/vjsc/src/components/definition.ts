declare const __PROPS_BRAND__: unique symbol;
declare const __EMPTY_PROPS__: unique symbol;

export type EmptyProps = {
  readonly [__EMPTY_PROPS__]?: never;
};

/** Anonymous component part definition nested beneath a named component. */
export interface ComponentPartDefinition<
  Props extends object = EmptyProps,
  Parts extends ComponentParts | undefined = undefined,
> {
  root?: Parts extends ComponentParts ? keyof Parts & string : never;
  parts?: Parts | undefined;
  dataAttrs?: Record<string, string> | undefined;
  readonly [__PROPS_BRAND__]?: Props;
}

export type ComponentParts = Record<string, ComponentPartDefinition<object, ComponentParts | undefined>>;

/** Named top-level component definition stored in a component schema. */
export interface ComponentDefinition<
  Props extends object = EmptyProps,
  Parts extends ComponentParts | undefined = undefined,
> extends ComponentPartDefinition<Props, Parts> {
  readonly name: string;
}

export type ComponentDefinitions = Record<string, ComponentDefinition<object, ComponentParts | undefined>>;

export interface ComponentSchema<
  Definitions extends ComponentDefinitions = ComponentDefinitions,
  Source extends string = string,
> {
  readonly source: Source;
  readonly definitions: Definitions;
}

type ComponentOptions<Props extends object, Parts extends ComponentParts | undefined> = Omit<
  ComponentPartDefinition<Props, Parts>,
  typeof __PROPS_BRAND__
>;

export function hasParts<Props extends object, Parts extends ComponentParts>(
  component: ComponentPartDefinition<Props, Parts | undefined>
): component is ComponentPartDefinition<Props, Parts> & { parts: Parts } {
  return Boolean(component.parts);
}

export type InferProps<T> = T extends ComponentPartDefinition<infer Props, ComponentParts | undefined> ? Props : never;

export type InferParts<T> = T extends ComponentPartDefinition<object, infer Parts> ? keyof NonNullable<Parts> : never;

export type InferPartProps<T, K extends string> =
  T extends ComponentPartDefinition<object, infer Parts>
    ? K extends keyof NonNullable<Parts>
      ? InferProps<NonNullable<Parts>[K]>
      : never
    : never;

export function defineComponent<Props extends object = EmptyProps>(): ComponentPartDefinition<Props>;

export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentParts = ComponentParts,
  const Root extends keyof Parts & string = keyof Parts & string,
>(
  options: Omit<ComponentOptions<Props, Parts>, 'root'> & { name: string; root: Root }
): ComponentDefinition<Props, Parts> & { readonly root: Root };

export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentParts = ComponentParts,
  const Root extends keyof Parts & string = keyof Parts & string,
>(
  options: Omit<ComponentOptions<Props, Parts>, 'root'> & { root: Root }
): ComponentPartDefinition<Props, Parts> & {
  readonly root: Root;
};

export function defineComponent<Props extends object = EmptyProps, const Parts extends ComponentParts = ComponentParts>(
  options: ComponentOptions<Props, Parts> & { name: string; parts: Parts }
): ComponentDefinition<Props, Parts>;

export function defineComponent<Props extends object = EmptyProps>(
  options: ComponentOptions<Props, undefined> & { name: string }
): ComponentDefinition<Props, undefined>;

export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentParts | undefined = undefined,
>(options: ComponentOptions<Props, Parts>): ComponentPartDefinition<Props, Parts>;

export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentParts | undefined = undefined,
>(options?: ComponentOptions<Props, Parts>): ComponentPartDefinition<Props, Parts> {
  return (options ?? {}) as ComponentPartDefinition<Props, Parts>;
}

export function defineSchema<const Source extends string, const Definitions extends ComponentDefinitions>(
  source: Source,
  definitions: Definitions
): ComponentSchema<Definitions, Source> {
  return { source, definitions };
}
