import { isFunction } from '@videojs/utils/predicate';
import type { Text } from '../../i18n';

export function resolveLabel<State>(
  label: Text | string | ((state: State) => Text | string) | undefined,
  state: State
): Text | string | undefined {
  if (isFunction(label)) {
    return label(state) || undefined;
  }
  return label || undefined;
}
