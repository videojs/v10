import { Signal } from 'signal-polyfill';
import { effect } from '../../core/signals/effect';
import type { PartiallyResolvedTextTrack, Presentation, TextTrack } from '../../core/types';

/**
 * State shape for text track setup.
 */
export interface TextTrackState {
  presentation?: Presentation | undefined;
  selectedTextTrackId?: string | undefined;
}

/**
 * Owners shape for text track setup.
 */
export interface TextTrackOwners {
  mediaElement?: HTMLMediaElement | undefined;
  textTracks?: Map<string, HTMLTrackElement>;
}

/**
 * Create a track element for a text track.
 *
 * Note: We use DOM <track> elements instead of the TextTrack JS API
 * because there's no way to remove TextTracks added via addTextTrack().
 */
function createTrackElement(track: PartiallyResolvedTextTrack | TextTrack): HTMLTrackElement {
  const trackElement = document.createElement('track');

  trackElement.id = track.id;
  trackElement.kind = track.kind;
  trackElement.label = track.label;

  if (track.language) {
    trackElement.srclang = track.language;
  }

  if (track.default) {
    trackElement.default = true;
  }

  // Set src to track URL
  trackElement.src = track.url;

  return trackElement;
}

/**
 * Setup text tracks orchestration.
 *
 * Triggers when:
 * - mediaElement exists
 * - presentation is resolved (has text tracks)
 *
 * Creates <track> elements for all text tracks and adds them as children
 * to the media element. This allows the browser's native text track rendering.
 *
 * Note: Uses DOM track elements instead of TextTrack API because tracks
 * added via addTextTrack() cannot be removed.
 *
 * @example
 * const cleanup = setupTextTracks({ state, owners });
 */
export function setupTextTracks<S extends TextTrackState, O extends TextTrackOwners>({
  state,
  owners,
}: {
  state: Signal.State<S>;
  owners: Signal.State<O>;
}): () => void {
  const modelTextTracksSignal = new Signal.Computed(
    // NOTE: This assumes exactly one selection set and switching set for TextTracks (CJP)
    () =>
      state.get().presentation?.selectionSets?.find((selectionSet) => selectionSet.type === 'text')?.switchingSets[0]
        ?.tracks,
    {
      /** @TODO Make generic and abstract away for Array<T> | undefined (CJP) */
      equals(prevTextTracks, nextTextTracks) {
        if (prevTextTracks === nextTextTracks) return true;
        if (typeof prevTextTracks !== typeof nextTextTracks) return false;
        if (prevTextTracks?.length !== nextTextTracks?.length) return false;
        // NOTE: This could probably be optimized, but the set should generally be small (CJP)
        return (
          !!nextTextTracks &&
          nextTextTracks.every((nextTextTrack) =>
            prevTextTracks?.some((prevTextTrack) => prevTextTrack.id === nextTextTrack.id)
          )
        );
      },
    }
  );
  const ownerTextTracksSignal = new Signal.Computed(() => owners.get().textTracks);
  const mediaElementSignal = new Signal.Computed(() => owners.get().mediaElement);

  const canSetupTextTracksSignal = new Signal.Computed(
    () => !!mediaElementSignal.get() && modelTextTracksSignal.get()?.length
  );
  const shouldSetupTextTracksSignal = new Signal.Computed(() => !ownerTextTracksSignal.get());

  const cleanupEffect = effect(() => {
    if (!canSetupTextTracksSignal.get() || !shouldSetupTextTracksSignal.get()) return;
    const mediaElement = mediaElementSignal.get();
    const modelTextTracks = modelTextTracksSignal.get() as TextTrack[];

    const trackMap = new Map<string, HTMLTrackElement>();
    modelTextTracks.forEach((modelTextTrack) => {
      const trackElement = createTrackElement(modelTextTrack);
      mediaElement!.appendChild(trackElement);
      trackMap.set(modelTextTrack.id, trackElement);
    });

    if (trackMap.size) {
      owners.set({ ...owners.get(), textTracks: trackMap } as O);
    }
  });

  return () => {
    owners.get().textTracks?.forEach((trackElement) => trackElement.remove());
    cleanupEffect();
  };
}
