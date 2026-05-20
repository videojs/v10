import { isFunction } from '@videojs/utils/predicate';

/**
 * Whether an event's path includes `element`, transparently traversing Shadow DOM.
 *
 * @param event - DOM event.
 * @param element - Element to test for inclusion.
 */
export function isEventWithinElement(event: Event, element: Element | null): boolean {
  if (!element) return false;

  if (isFunction(event.composedPath)) {
    return event.composedPath().includes(element);
  }

  const target = event.target;
  return target instanceof Node && element.contains(target);
}
