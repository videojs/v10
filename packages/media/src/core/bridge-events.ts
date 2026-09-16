import { redispatchEvent } from '@videojs/utils/events';

/** Wrap `source.dispatchEvent` so every event is also re-dispatched on `target`. */
export function bridgeEvents(source: EventTarget, target: EventTarget): void {
  if (!source.dispatchEvent) return;

  source.dispatchEvent = (event: Event) => redispatchEvent(target, event);
}
