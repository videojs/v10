import { resolveEventTarget } from './event';

export const INTERACTIVE_SELECTOR = 'button,input,select,textarea,a[href],[role="slider"],[role="button"]';

const EDITABLE_INPUT_TYPES = ['text', 'search', 'url', 'tel', 'email', 'password', 'number'];

export const EDITABLE_SELECTOR = [
  'textarea',
  'select',
  'input:not([type])',
  ...EDITABLE_INPUT_TYPES.map((type) => `input[type="${type}"]`),
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

export function isEditableElement(el: Element): boolean {
  return el.matches(EDITABLE_SELECTOR);
}

/** Whether the keyboard event target is an editable element (input, textarea, etc). */
export function isEditableTarget(event: KeyboardEvent): boolean {
  const target = resolveEventTarget(event);
  return target instanceof Element && isEditableElement(target);
}

/** Whether the event originated from an interactive control (button, slider, etc). */
export function isInteractiveTarget(event: Event): boolean {
  const target = resolveEventTarget(event);
  if (!(target instanceof Element)) return false;
  return target.closest(INTERACTIVE_SELECTOR) !== null;
}

const ACTIVATION_KEYS = new Set([' ', 'Enter']);

/** Whether the event is an activation key on an interactive element (button, slider). */
export function isInteractiveActivation(event: KeyboardEvent): boolean {
  if (!ACTIVATION_KEYS.has(event.key)) return false;

  const target = resolveEventTarget(event);
  return target instanceof Element && target.matches(INTERACTIVE_SELECTOR);
}
