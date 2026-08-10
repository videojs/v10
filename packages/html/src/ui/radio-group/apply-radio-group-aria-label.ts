import { type Text, type Translator, translateText } from '@videojs/core/i18n';

const generatedLabels = new WeakMap<HTMLElement, string>();

export function applyRadioGroupAriaLabel(
  element: HTMLElement,
  translator: Translator,
  label: Text | string,
  params?: Record<string, string | number>
): void {
  if (element.hasAttribute('aria-labelledby')) return;

  const current = element.getAttribute('aria-label');
  if (current !== null && current !== generatedLabels.get(element)) return;

  const next = translateText(label, translator, params);
  generatedLabels.set(element, next);
  element.setAttribute('aria-label', next);
}
