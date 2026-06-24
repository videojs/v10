declare const __PROPS_BRAND__: unique symbol;
declare const __EMPTY_PROPS__: unique symbol;

export type EmptyProps = {
  readonly [__EMPTY_PROPS__]?: never;
};

export interface ComponentPart<Props extends object = EmptyProps> {
  readonly [__PROPS_BRAND__]?: Props;
}

export interface ComponentPartGroup<Parts extends ComponentPartRecord = ComponentPartRecord> {
  parts: Parts;
}

export type ComponentPartRecord = Record<string, ComponentPart<any> | ComponentPartGroup>;

export interface ComponentManifest<Props extends object = EmptyProps> {
  name: string;
  dataAttrs?: Record<string, string>;
  readonly [__PROPS_BRAND__]?: Props;
}

export interface ComponentGroupManifest<Parts extends ComponentPartRecord = ComponentPartRecord> {
  name: string;
  parts: Parts;
  dataAttrs?: Record<string, string>;
}

export type AnyComponentManifest = ComponentManifest<object> | ComponentGroupManifest<ComponentPartRecord>;

type ComponentDefinition<Props extends object> = Omit<ComponentManifest<Props>, typeof __PROPS_BRAND__>;
type ComponentGroupDefinition<Parts extends ComponentPartRecord> = ComponentGroupManifest<Parts>;

interface DefineComponentFactory<Props extends object> {
  <const Parts extends ComponentPartRecord>(manifest: ComponentGroupDefinition<Parts>): ComponentGroupManifest<Parts>;
  (manifest: ComponentDefinition<Props>): ComponentManifest<Props>;
}

export type InferProps<T> =
  T extends ComponentManifest<infer Props> ? Props : T extends ComponentPart<infer Props> ? Props : never;

export type InferParts<T> =
  T extends ComponentGroupManifest<infer Parts>
    ? keyof Parts
    : T extends ComponentPartGroup<infer Parts>
      ? keyof Parts
      : never;

export type InferPartProps<T, K extends string> =
  T extends ComponentGroupManifest<infer Parts> ? (K extends keyof Parts ? InferProps<Parts[K]> : never) : never;

export function defineComponentPart<Props extends object = EmptyProps>(): ComponentPart<Props> {
  return {} as ComponentPart<Props>;
}

export function defineComponentPartGroup<const Parts extends ComponentPartRecord>(
  parts: Parts
): ComponentPartGroup<Parts> {
  return { parts };
}

/** Define a component manifest. */
export function defineComponent<Props extends object = EmptyProps>(): DefineComponentFactory<Props> {
  return ((manifest: ComponentDefinition<Props> | ComponentGroupDefinition<ComponentPartRecord>) =>
    manifest) as DefineComponentFactory<Props>;
}
