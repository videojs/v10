/** Wrap `source.dispatchEvent` so every event is also re-dispatched on `target`. */
export function bridgeEvents(source: EventTarget, target: EventTarget): void {
  if (!source.dispatchEvent) return;
  source.dispatchEvent = (event: Event) =>
    target.dispatchEvent(
      new /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (event.constructor as typeof Event)(
        event.type,
        event
      )
    );
}
