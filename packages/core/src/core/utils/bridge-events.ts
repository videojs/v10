/**
 * Wrap `source.dispatchEvent` so every event is also re-dispatched on `target`.
 * Source's own listeners still fire — the original `dispatchEvent` is invoked
 * before the bridged dispatch. Event types in `excludeEvents` are dispatched
 * locally but not forwarded.
 */
export function bridgeEvents(source: EventTarget, target: EventTarget, excludeEvents: readonly string[] = []): void {
  if (!source.dispatchEvent) return;
  const excluded = new Set(excludeEvents);
  const original = source.dispatchEvent.bind(source);
  source.dispatchEvent = (event: Event) => {
    const result = original(event);
    if (!excluded.has(event.type)) {
      target.dispatchEvent(new (event.constructor as typeof Event)(event.type, event));
    }
    return result;
  };
}
