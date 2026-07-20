import { isFunction } from '@videojs/utils/predicate';

export function resolveLabel<State>(
  label: string | ((state: State) => string) | undefined,
  state: State
): string | undefined {
  if (isFunction(label)) {
    return label(state) || undefined;
  }
  return label || undefined;
}
