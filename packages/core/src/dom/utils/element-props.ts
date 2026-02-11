import { listen } from '@videojs/utils/dom';
import { isFunction, isUndefined } from '@videojs/utils/predicate';

/**
 * Apply props to a DOM element.
 *
 * Handles both attributes and event listeners:
 * - Event props (onClick, onKeyDown, etc.) are attached as listeners
 * - Boolean props: `true` sets empty attribute, `false` removes
 * - `undefined` removes the attribute
 * - Other props are set as string attributes
 */
export function applyElementProps(element: HTMLElement, props: object, signal?: AbortSignal): void {
  for (const [key, value] of Object.entries(props)) {
    if (isFunction(value) && key.startsWith('on')) {
      const event = key.slice(2).toLowerCase();
      listen(element, event, value as EventListener, signal ? { signal } : undefined);
    } else if (isUndefined(value) || value === false) {
      element.removeAttribute(key);
    } else if (value === true) {
      element.setAttribute(key, '');
    } else {
      element.setAttribute(key, String(value));
    }
  }
}
