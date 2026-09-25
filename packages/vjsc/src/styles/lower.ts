import { Features, type Targets, transform } from 'lightningcss';

const encoder = new TextEncoder();

const decoder = new TextDecoder();

export interface LowerStylesOptions {
  /** Browsers the stylesheet must render in, from `browserslistToTargets()`. */
  readonly targets: Targets;
}

/**
 * Features Lightning CSS would rewrite for every browser rather than only the old ones: `:dir()` becomes a `:lang()`
 * list, and `light-dark()` depends on `color-scheme` declarations the stylesheet does not own. The skin source keeps
 * `:dir()` beside `[dir]` selectors and guards `light-dark()` behind `@supports` with its own fallback.
 */
export const PRESERVED_FEATURES = Features.DirSelector | Features.LightDark;

/**
 * Lower a stylesheet so it renders in `targets`: flatten nesting and add the vendor prefixes they need. Color features
 * Lightning CSS cannot lower, such as `contrast-color()` or relative colors from a variable, carry fallbacks in the
 * skin source instead, which also reach consumers who compile the skins' Tailwind themselves.
 */
export function lowerStyles(css: string, options: LowerStylesOptions): string {
  return decoder.decode(
    transform({
      filename: 'lowered.css',
      code: encoder.encode(css),
      targets: options.targets,
      exclude: PRESERVED_FEATURES,
    }).code
  );
}
