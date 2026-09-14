export interface RedispatchEventOptions {
  /** Inspect or mark the copied event immediately before it is dispatched. */
  beforeDispatch?: (event: Event) => void;
}

interface CopyableEventConstructor {
  new (type: string, eventInit: Event): Event;
}

/**
 * Re-dispatch a best-effort copy of an event on another target. Falls back to a base `Event` when the original event's
 * constructor cannot copy it, so subclass-specific data may be lost.
 *
 * @returns The result of `target.dispatchEvent()`.
 */
export function redispatchEvent(target: EventTarget, event: Event, options?: RedispatchEventOptions): boolean {
  let copy: Event;

  try {
    // SAFETY: DOM event subclasses conventionally accept their event-init shape as the second constructor argument;
    // the fallback below handles custom event implementations that do not.
    const EventConstructor = event.constructor as CopyableEventConstructor;

    copy = new EventConstructor(event.type, event);
  } catch {
    copy = new Event(event.type, event);
  }

  options?.beforeDispatch?.(copy);

  return target.dispatchEvent(copy);
}
