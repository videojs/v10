import type { StyleManifest } from './manifest';

export interface StylesheetOptions {
  /** Tailwind CSS entry used to resolve utilities, theme tokens, and variants. */
  readonly input: string;
  /** Runtime base CSS entry imported before generated semantic styles. */
  readonly base?: string | undefined;
  /** Optional selector wrapped around emitted CSS with `@scope`. */
  readonly scope?: string | undefined;
}

interface StylePluginBaseOptions {
  /** Ordered variant utilities to append to each rule's base utilities when defined. */
  readonly variants?: readonly string[] | undefined;
  /** Preloaded definitions for programmatic builds; imports are discovered by default. */
  readonly manifest?: StyleManifest | undefined;
}

export type StylePluginOptions =
  | (StylePluginBaseOptions & {
      /** Project style references to editable Tailwind utility groups. */
      readonly mode: 'tailwind';
      readonly stylesheet?: never;
    })
  | (StylePluginBaseOptions & {
      readonly mode: 'css';
      /** Create CSS modules in addition to transforming semantic class names. */
      readonly stylesheet?: StylesheetOptions | undefined;
    });
