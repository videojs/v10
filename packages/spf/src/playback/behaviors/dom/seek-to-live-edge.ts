/**
 * Seek the playhead into the live window once segments are buffered.
 *
 * Live segments append at their native PTS, so the buffered range sits at a
 * large timestamp while `currentTime` starts at 0 — there's no media at 0, so
 * `readyState` never advances and playback can't start. This watches for the
 * buffered range to appear and, while the playhead is still before it, seeks
 * `currentTime` into the window (its start) so playback can begin.
 *
 * Fires once per source. `readyState`-gated events (`canplay`/`loadeddata`)
 * can't be relied on (they need data *at* `currentTime`), so it listens to
 * events that fire regardless — `loadedmetadata`, `durationchange`, `progress`
 * — plus an initial check; `emptied` resets it for a reused element.
 *
 * Starts at the window start (simplest, guaranteed playable). Live-edge
 * latency tuning (start near `buffered.end`) is a follow-up.
 */
import { listen } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import type { ReadonlySignal } from '../../../core/signals/primitives';

export interface SeekToLiveEdgeContext {
  mediaElement?: HTMLMediaElement | undefined;
}

function seekToLiveEdgeSetup({
  context,
}: {
  context: { mediaElement: ReadonlySignal<SeekToLiveEdgeContext['mediaElement']> };
}): () => void {
  return effect(() => {
    const mediaElement = context.mediaElement.get();
    if (!mediaElement) return;

    let seeked = false;
    const trySeek = () => {
      if (seeked) return;
      const { buffered } = mediaElement;
      if (buffered.length === 0) return;
      const start = buffered.start(0);
      // Native-PTS live gap: playhead sits before the buffered window.
      if (mediaElement.currentTime < start) {
        mediaElement.currentTime = start;
        seeked = true;
      }
    };

    trySeek();
    const removers = [
      listen(mediaElement, 'loadedmetadata', trySeek),
      listen(mediaElement, 'durationchange', trySeek),
      listen(mediaElement, 'progress', trySeek),
      listen(mediaElement, 'emptied', () => {
        seeked = false;
      }),
    ];
    return () => {
      for (const remove of removers) remove();
    };
  });
}

export const seekToLiveEdge = defineBehavior({
  stateKeys: [],
  contextKeys: ['mediaElement'],
  setup: seekToLiveEdgeSetup,
});
