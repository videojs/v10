import { isMenuNavigationKey } from '@videojs/core/dom';

const preventedEvents = new WeakSet<Event>();
const canceledEvents = new WeakSet<Event>();

// Menu keys are prevented during capture before native player hotkeys run.
// Track that internal prevention so bubble handlers can still honor a consumer
// that calls preventDefault() to opt out of the built-in menu behavior.
export function preventMenuKeyDefault(event: React.KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Escape' && isMenuNavigationKey(event) && !event.defaultPrevented) {
    event.preventDefault();
    preventedEvents.add(event.nativeEvent);
  }
}

export function callKeyDownHandler<T extends HTMLElement>(
  handler: React.KeyboardEventHandler<T> | undefined,
  event: React.KeyboardEvent<T>
): boolean {
  const defaultPreventedBeforeHandler =
    event.defaultPrevented && (!preventedEvents.has(event.nativeEvent) || canceledEvents.has(event.nativeEvent));

  if (!handler) return defaultPreventedBeforeHandler;

  let defaultPreventedByHandler = false;
  const preventDefault = event.preventDefault;

  event.preventDefault = () => {
    defaultPreventedByHandler = true;
    preventDefault.call(event);
  };

  try {
    handler(event);
  } finally {
    event.preventDefault = preventDefault;
  }

  if (defaultPreventedByHandler) canceledEvents.add(event.nativeEvent);

  return defaultPreventedBeforeHandler || defaultPreventedByHandler;
}
