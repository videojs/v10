declare const __PROPS_BRAND__: unique symbol;

export interface ComponentManifest<
  Props extends object = Record<string, never>,
  Parts extends readonly string[] = readonly string[],
  PartProps extends Partial<Record<Parts[number], object>> = Partial<Record<Parts[number], object>>,
> {
  name: string;
  parts?: Parts;
  dataAttrs?: Record<string, string>;
  partProps?: PartProps;
  readonly [__PROPS_BRAND__]?: Props;
}

export type InferProps<T> =
  T extends ComponentManifest<infer P, readonly string[], Partial<Record<string, object>>> ? P : never;

export type InferParts<T> =
  T extends ComponentManifest<object, infer Parts, Partial<Record<string, object>>>
    ? readonly string[] extends Parts
      ? never
      : Parts[number]
    : never;

export type InferPartProps<T, K extends string> =
  T extends ComponentManifest<object, readonly string[], infer PartProps>
    ? K extends keyof PartProps
      ? PartProps[K]
      : never
    : never;

/**
 * Define a component manifest.
 *
 * Curried so the `Props` generic can be supplied without disabling inference
 * of `Parts` and `PartProps` from the manifest body:
 *
 * @example
 *   const Slider = defineComponent<SliderProps>()({
 *     name: 'Slider',
 *     parts: SliderParts,
 *     dataAttrs: SliderDataAttrs,
 *   });
 *
 *   const Controls = defineComponent()({
 *     name: 'Controls',
 *     parts: ControlsParts,
 *     dataAttrs: ControlsDataAttrs,
 *   });
 */
export function defineComponent<Props extends object = Record<string, never>>() {
  return <
    const Parts extends readonly string[] = readonly string[],
    const PartProps extends Partial<Record<Parts[number], object>> = Partial<Record<Parts[number], object>>,
  >(
    manifest: Omit<ComponentManifest<Props, Parts, PartProps>, typeof __PROPS_BRAND__>
  ): ComponentManifest<Props, Parts, PartProps> => manifest as ComponentManifest<Props, Parts, PartProps>;
}
