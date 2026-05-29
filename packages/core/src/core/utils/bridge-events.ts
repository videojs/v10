/** Wrap `source.dispatchEvent` so every event is also re-dispatched on `target`. */
export function bridgeEvents(source: EventTarget, target: EventTarget): void {
  if (!source.dispatchEvent) return;
  const original = source.dispatchEvent.bind(source);
  source.dispatchEvent = (event: Event) => {
    const result = original(event);
    target.dispatchEvent(new (event.constructor as typeof Event)(event.type, event));
    return result;
  };
}
