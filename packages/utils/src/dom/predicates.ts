import { resolveEventTarget } from './event';

export function isHTMLVideoElement(value: unknown): value is HTMLVideoElement {
  return value instanceof HTMLVideoElement;
}

export function isHTMLAudioElement(value: unknown): value is HTMLAudioElement {
  return value instanceof HTMLAudioElement;
}

export function isHTMLMediaElement(value: unknown): value is HTMLMediaElement {
  return value instanceof HTMLMediaElement;
}

const EDITABLE_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number']);

export function isEditableElement(el: Element): boolean {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLSelectElement) return true;

  if (el instanceof HTMLInputElement) {
    return EDITABLE_INPUT_TYPES.has(el.type.toLowerCase());
  }

  if (!(el instanceof HTMLElement)) return false;

  const editable = el.getAttribute('contenteditable');
  return editable !== null && editable !== 'false';
}

/** Whether the keyboard event target is an editable element (input, textarea, etc). */
export function isEditableTarget(event: KeyboardEvent): boolean {
  const target = resolveEventTarget(event);
  return target instanceof Element && isEditableElement(target);
}
