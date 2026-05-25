import { resolveTranslationPhrase } from '../i18n/resolve-translation-phrase';
import type { Translator } from '../i18n/types';
import type { TranslationKeyOrString } from './types';

export interface ControlAttrsResolvable<State> {
  getAttrs?(state: State): object;
  getLabelParams?(state: State): Record<string, string | number> | undefined;
  getValueTextParams?(state: State): Record<string, string | number> | undefined;
}

export interface ControlLabelResolvable<State> {
  getLabel(state: State): TranslationKeyOrString;
  getLabelParams?(state: State): Record<string, string | number> | undefined;
}

/** Resolves `getLabel` and optional {@link ControlLabelResolvable.getLabelParams}. */
export function resolveControlLabel<State>(
  translator: Translator,
  core: ControlLabelResolvable<State>,
  state: State
): string {
  return resolveTranslationPhrase(translator, core.getLabel(state), core.getLabelParams?.(state));
}

/** Resolves `aria-label` / `aria-valuetext` keys from {@link ControlAttrsResolvable.getAttrs}. */
export function resolveControlAttrs<State>(
  translator: Translator,
  core: ControlAttrsResolvable<State>,
  state: State
): Record<string, string | undefined> {
  const raw = (core.getAttrs?.(state) ?? {}) as Record<string, unknown>;
  const out: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) {
      out[key] = undefined;
      continue;
    }

    if (key === 'aria-label' && typeof value === 'string') {
      out[key] = resolveTranslationPhrase(translator, value as TranslationKeyOrString, core.getLabelParams?.(state));
      continue;
    }

    if (key === 'aria-valuetext' && typeof value === 'string') {
      out[key] = resolveTranslationPhrase(
        translator,
        value as TranslationKeyOrString,
        core.getValueTextParams?.(state)
      );
      continue;
    }

    out[key] = String(value);
  }

  return out;
}
