import type { ClassNameValue } from './jsx-runtime';

/** A shared component whose rendered element each framework target selects. */
export interface RenderTargetDefinition {
  readonly className: ClassNameValue;
}

/**
 * Define one shared component or part whose element is selected by the framework target. Export it under the name the
 * target's `renderTargets` table uses, then attach it to a canonical component with `$render={Name}`. The compiler
 * lowers both the definition and every `$render` use per target; nothing here runs at runtime.
 */
export function defineRenderTarget(className: ClassNameValue): RenderTargetDefinition {
  return { className };
}
