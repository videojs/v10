import { listen } from '@videojs/utils/dom';
import type { EventStream } from '../../core/events/create-event-stream';
import type { PresentationAction } from '../../core/features/resolve-presentation';
import type { WritableState } from '../../core/state/create-state';

/**
 * Owners shape for play event forwarding.
 */
export interface ForwardPlayOwners {
  mediaElement?: HTMLMediaElement;
}

/**
 * Bridge the media element's native `play` event to the SPF event stream.
 *
 * When the media element fires `play` (via `element.play()`, native controls,
 * or autoplay), dispatches `{ type: 'play' }` to the event stream so that
 * `resolvePresentation` can react — in particular, triggering playlist
 * resolution when `preload="none"`.
 *
 * @example
 * const cleanup = forwardPlayEvent({ owners, events });
 */
export function forwardPlayEvent({
  owners,
  events,
}: {
  owners: WritableState<ForwardPlayOwners>;
  events: EventStream<PresentationAction>;
}): () => void {
  let lastMediaElement: HTMLMediaElement | undefined;
  let removeListener: (() => void) | null = null;

  const unsubscribe = owners.subscribe((currentOwners) => {
    const { mediaElement } = currentOwners;

    if (mediaElement === lastMediaElement) return;

    removeListener?.();
    removeListener = null;
    lastMediaElement = mediaElement;

    if (!mediaElement) return;

    removeListener = listen(mediaElement, 'play', () => {
      events.dispatch({ type: 'play' });
    });
  });

  return () => {
    removeListener?.();
    unsubscribe();
  };
}
