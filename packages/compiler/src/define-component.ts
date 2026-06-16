declare const __PROPS_BRAND__: unique symbol;

export interface ComponentManifest<
  Props = unknown,
  Parts extends readonly string[] = readonly string[],
  PartProps extends Record<string, unknown> = Record<string, never>,
> {
  name: string;
  parts?: Parts;
  dataAttrs?: Record<string, string>;
  partProps?: PartProps;
  readonly [__PROPS_BRAND__]?: Props;
}

export type InferProps<T> =
  T extends ComponentManifest<infer P, readonly string[], Record<string, unknown>> ? P : never;

export type InferParts<T> =
  T extends ComponentManifest<unknown, infer Parts, Record<string, unknown>>
    ? readonly string[] extends Parts
      ? never
      : Parts[number]
    : never;

export type InferPartProps<T, K extends string> =
  T extends ComponentManifest<unknown, readonly string[], infer PartProps>
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
export function defineComponent<Props = unknown>() {
  return <
    const Parts extends readonly string[] = readonly string[],
    const PartProps extends Record<string, unknown> = Record<string, never>,
  >(
    manifest: Omit<ComponentManifest<Props, Parts, PartProps>, typeof __PROPS_BRAND__>
  ): ComponentManifest<Props, Parts, PartProps> => manifest as ComponentManifest<Props, Parts, PartProps>;
}
