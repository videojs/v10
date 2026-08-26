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
  root?: Parts extends ComponentRecord ? keyof Parts & string : never;
  parts?: Parts | undefined;
  dataAttrs?: Record<string, string> | undefined;
  readonly [__PROPS_BRAND__]?: Props;
}

export type ComponentRecord = Record<string, ComponentDefinition<object, ComponentRecord | undefined>>;

export type ComponentManifest<
  Props extends object = object,
  Parts extends ComponentRecord | undefined = ComponentRecord | undefined,
> = ComponentDefinition<Props, Parts> & { name: string };

export interface ComponentSchema<
  Definitions extends ComponentRecord = ComponentRecord,
  Source extends string = string,
> {
  readonly source: Source;
  readonly definitions: Definitions;
}

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
  const Parts extends ComponentRecord = ComponentRecord,
  const Root extends keyof Parts & string = keyof Parts & string,
>(
  options: Omit<ComponentOptions<Props, Parts>, 'root'> & { name: string; root: Root }
): ComponentManifest<Props, Parts> & { readonly root: Root };

export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentRecord = ComponentRecord,
  const Root extends keyof Parts & string = keyof Parts & string,
>(
  options: Omit<ComponentOptions<Props, Parts>, 'root'> & { root: Root }
): ComponentDefinition<Props, Parts> & {
  readonly root: Root;
};

export function defineComponent<
  Props extends object = EmptyProps,
  const Parts extends ComponentRecord = ComponentRecord,
>(options: ComponentOptions<Props, Parts> & { name: string; parts: Parts }): ComponentManifest<Props, Parts>;

export function defineComponent<Props extends object = EmptyProps>(
  options: ComponentOptions<Props, undefined> & { name: string }
): ComponentManifest<Props, undefined>;

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

export function defineSchema<const Source extends string, const Definitions extends ComponentRecord>(
  source: Source,
  definitions: Definitions
): ComponentSchema<Definitions, Source> {
  return { source, definitions };
}
