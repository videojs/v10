/** CSS compilation inputs used when `mode` is `css`. */
export interface StylesheetOptions {
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

/** Replace style references with their Tailwind utility classes. */
export interface TailwindTransformOptions extends StyleTransformBaseOptions {
  readonly mode: 'tailwind';
  readonly stylesheet?: never;
}

/** Replace style references with semantic class names and optionally emit their CSS. */
export interface CssTransformOptions extends StyleTransformBaseOptions {
  readonly mode: 'css';
  /** Compile referenced styles using this stylesheet environment. */
  readonly stylesheet?: StylesheetOptions | undefined;
}

export type StyleTransformOptions = TailwindTransformOptions | CssTransformOptions;
