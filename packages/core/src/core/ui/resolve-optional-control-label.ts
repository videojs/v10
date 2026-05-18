import { isFunction } from '@videojs/utils/predicate';

import type { TranslationKeyOrString } from './types';

/**
 * Resolves a user-provided control `label` prop ({@link TranslationKeyOrString} or state callback).
 * Returns `undefined` when the caller should use its built-in default (registry id, slider default, etc.).
 */
export function resolveOptionalControlLabel<State>(
  label: TranslationKeyOrString | ((state: State) => TranslationKeyOrString) | undefined,
  state: State
): TranslationKeyOrString | undefined {
  if (isFunction(label)) {
    const custom = label(state);
    return custom ? custom : undefined;
  }
  if (label) return label;
  return undefined;
}
