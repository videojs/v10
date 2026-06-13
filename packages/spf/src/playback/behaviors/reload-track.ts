/**
 * **POC SPIKE** — live media-playlist reload loop.
 *
 * Drives the live foundation at the playlist layer only (no MSE, no segment
 * fetching): once a video track is selected and the presentation is resolved,
 * repeatedly re-fetch + parse that track's media playlist on a target-duration
 * cadence — passing the prior snapshot back in so the parser carries the
 * timeline forward — and patch it into `state.presentation` until
 * `#EXT-X-ENDLIST`. Validates the model in
 * [live-presentation-modeling.md](../../../internal/design/spf/live-presentation-modeling.md).
 *
 * Spike limitations (intentional): video only; selection is read once at loop
 * start (mid-stream track switching isn't handled — the reactor's two states
 * don't encode the track id); PDT / discontinuity / A/V sync untouched.
 */
import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal, update } from '../../core/signals/primitives';
import { parseMediaPlaylist } from '../../media/hls/parse-media-playlist';
import {
  deriveStreamType,
  getMediaPlaylistMetadata,
  isResolvedPresentation,
  isResolvedTrack,
  type MaybeResolvedPresentation,
  type ResolvedTrack,
} from '../../media/types';
import { findTrack, updateTrackInPresentation } from '../../media/utils/tracks';
import { fetchResolvableText } from '../../network/fetch';

export interface ReloadTrackState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
}

type ReloadTrackStateName = 'idle' | 'reloading';

/** Fallback reload cadence when the playlist carries no usable target duration. */
const FALLBACK_TARGET_DURATION = 6;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

/** A reload is "live" (new content) when the window slid or grew. */
function snapshotChanged(prev: ResolvedTrack, next: ResolvedTrack): boolean {
  return (
    getMediaPlaylistMetadata(prev)?.mediaSequence !== getMediaPlaylistMetadata(next)?.mediaSequence ||
    prev.segments.length !== next.segments.length
  );
}

function reloadTrackSetup({
  state,
}: {
  state: {
    presentation: Signal<ReloadTrackState['presentation']>;
    selectedVideoTrackId: ReadonlySignal<ReloadTrackState['selectedVideoTrackId']>;
  };
}) {
  const derivedStateSignal = computed<ReloadTrackStateName>(() => {
    const presentation = state.presentation.get();
    const trackId = state.selectedVideoTrackId.get();
    if (!isResolvedPresentation(presentation) || !trackId) return 'idle';
    return findTrack(presentation, 'video', trackId) ? 'reloading' : 'idle';
  });

  return createMachineReactor<ReloadTrackStateName>({
    initial: 'idle',
    monitor: () => derivedStateSignal.get(),
    states: {
      idle: {},
      reloading: {
        entry: () => {
          const ac = new AbortController();
          const trackId = state.selectedVideoTrackId.get()!;

          void (async () => {
            try {
              while (!ac.signal.aborted) {
                const presentation = peek(state.presentation);
                if (!isResolvedPresentation(presentation)) break;
                // The track currently in the presentation is the prior snapshot
                // (the unresolved shell on the first pass, the last resolved
                // window thereafter); the parser carries its timeline forward.
                const previousTrack = findTrack(presentation, 'video', trackId);
                if (!previousTrack) break;

                const text = await fetchResolvableText(previousTrack, { signal: ac.signal });
                const parsed: ResolvedTrack = parseMediaPlaylist(text, previousTrack);
                const meta = getMediaPlaylistMetadata(parsed);
                // The first resolve (previous still an unresolved shell) counts as changed.
                const changed = !isResolvedTrack(previousTrack) || snapshotChanged(previousTrack, parsed);

                update(state.presentation, (current) => {
                  if (!isResolvedPresentation(current)) return current;
                  const patched = updateTrackInPresentation(current, parsed);
                  // streamType is stable across reloads, so recomputing it is harmless.
                  return { ...patched, streamType: deriveStreamType(meta) };
                });

                if (meta?.endList) break;

                const target = meta?.targetDuration || FALLBACK_TARGET_DURATION;
                // Spec: reload ~target duration; half that when the playlist was unchanged.
                await sleep((changed ? target : target / 2) * 1000, ac.signal);
              }
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') return;
              // TODO(error-management): route to a state-error slot once one exists.
              console.error('[reloadTrack] media-playlist reload failed:', error);
            }
          })();

          // State-exit (source change / destroy) aborts the loop.
          return () => ac.abort();
        },
      },
    },
  });
}

export const reloadTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'],
  contextKeys: [],
  setup: reloadTrackSetup,
});
