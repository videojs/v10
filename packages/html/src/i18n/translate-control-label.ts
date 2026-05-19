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

export interface LabelTrigger {
  getLabel(): TranslationKeyOrString | undefined;
  getLabelTranslationParams?(): unknown;
}

/** Resolves tooltip copy from a control that exposes label keys (and optional params). */
export function translateTriggerLabel(translator: Translator, trigger: LabelTrigger): string {
  const label = trigger.getLabel();
  if (!label) return '';
  return translateControlLabel(translator, label, trigger.getLabelTranslationParams?.());
}
