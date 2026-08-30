export interface CssTransformOptions {
  /** Tailwind CSS entry used to resolve utilities, theme tokens, and variants. */
  readonly input: string;
  /** Runtime base CSS entry imported before generated semantic styles. */
  readonly base?: string | undefined;
  /** Optional selector wrapped around emitted CSS with `@scope`. */
  readonly scope?: string | undefined;
}

interface StyleTransformBaseOptions {
  /** Ordered variant utilities to append to each rule's base utilities when defined. */
  readonly variants?: readonly string[] | undefined;
}

export type StyleTransformOptions =
  | (StyleTransformBaseOptions & {
      /** Project style references to editable Tailwind utility groups. */
      readonly mode: 'tailwind';
      readonly css?: never;
    })
  | (StyleTransformBaseOptions & {
      readonly mode: 'css';
      /** Create CSS modules in addition to transforming semantic class names. */
      readonly css?: CssTransformOptions | undefined;
    });
