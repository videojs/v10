export function isEventWithinElement(event: Event, element: Element | null): boolean {
  if (!element) return false;

  if (typeof event.composedPath === 'function') {
    return event.composedPath().includes(element);
  }

  const target = event.target;
  return target instanceof Node && element.contains(target);
}
