import type { ClassNameValue } from 'vjsc/components';

export interface RenderTargetDefinition<Name extends string = string> {
  readonly name: Name;
  readonly className: ClassNameValue;
}

/** Define one shared component or part whose element is selected by the framework target. */
export function defineRenderTarget<const Name extends string>(
  name: Name,
  className: ClassNameValue
): RenderTargetDefinition<Name> {
  return { name, className };
}
