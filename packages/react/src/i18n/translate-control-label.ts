import type { TranslationKeyOrString, Translator } from '@videojs/core/i18n';
import { isFunction } from '@videojs/utils/predicate';

type LooseTranslator = (key: string, params?: unknown) => string;

/** Resolves a control label (registry key or literal) through the active translator. */
export function translateControlLabel(translator: Translator, label: TranslationKeyOrString, params?: unknown): string {
  const t = translator as LooseTranslator;
  return params === undefined ? t(label) : t(label, params);
}

/** Translates `aria-label` on attrs objects returned from core `getAttrs`. */
export function translateAriaLabelAttrs<T extends object>(
  translator: Translator,
  attrs: T,
  label: TranslationKeyOrString,
  params?: unknown
): T {
  if (!('aria-label' in attrs)) return attrs;
  return {
    ...attrs,
    'aria-label': translateControlLabel(translator, label, params),
  };
}

export function resolveButtonLabelParams<Core extends object>(core: Core, state: object): unknown | undefined {
  if (!('getLabelParams' in core) || !isFunction((core as { getLabelParams?: unknown }).getLabelParams)) {
    return undefined;
  }
  return (core as { getLabelParams: (s: object) => unknown }).getLabelParams(state);
}

/** Resolves tooltip copy from a registry key (and optional params). */
export function translateTooltipLabel(
  translator: Translator,
  label: TranslationKeyOrString | undefined,
  params?: unknown
): string | undefined {
  if (!label) return undefined;
  return translateControlLabel(translator, label, params);
}
