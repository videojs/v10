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
  /**
   * Whether the part owns an element in its contract. Set `false` for parts that only provide context or behavior to
   * their children: framework bindings render nothing of their own for them, so a host ref cannot land anywhere.
   * Defaults to `true`.
   */
  element?: boolean | undefined;
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

/**
 * Find the definition a component path names, such as `Menu` with `['Trigger']` for `Menu.Trigger`. Returns `undefined`
 * when the schema has no such component or part.
 */
export function findComponentPart(
  schema: ComponentSchema,
  component: string,
  path: readonly string[] = []
): ComponentPartDefinition<object, ComponentParts | undefined> | undefined {
  let definition: ComponentPartDefinition<object, ComponentParts | undefined> | undefined =
    schema.definitions[component];

  for (const part of path) definition = definition?.parts?.[part];

  return definition;
}

export type InferProps<T> = T extends ComponentPartDefinition<infer Props, ComponentParts | undefined> ? Props : never;

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

export function defineComponent<Props extends object = EmptyProps>(
  options: ComponentOptions<Props, undefined>
): ComponentPartDefinition<Props, undefined>;

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
