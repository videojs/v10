import { listen } from '@videojs/utils/dom';
import type { WritableState } from '../../core/state/create-state';

/**
 * State shape for DOM-driven text track selection.
 */
export interface SelectedTextTrackFromDomState {
  selectedTextTrackId?: string | undefined;
}

/**
 * Owners shape for DOM-driven text track selection.
 */
export interface SelectedTextTrackFromDomOwners {
  mediaElement?: HTMLMediaElement | undefined;
}

/**
 * Sync selectedTextTrackId from DOM text track mode changes.
 *
 * Listens to the `change` event on `media.textTracks` and updates
 * `selectedTextTrackId` when external code (e.g. the captions button via
 * `toggleSubtitles()`) changes a subtitle/caption track mode to 'showing'.
 *
 * This bridges the core store's `toggleSubtitles()` with SPF's reactive text
 * track pipeline (`syncTextTrackModes`, `loadTextTrackCues`). Without this
 * bridge, direct DOM mode changes would be immediately overridden by
 * `syncTextTrackModes` on the next SPF state update.
 *
 * When a subtitle/caption track's mode is 'showing', its DOM `id` — which
 * matches the SPF track ID set by `setupTextTracks` — is written to
 * `selectedTextTrackId`. When no subtitle/caption track is 'showing',
 * `selectedTextTrackId` is cleared.
 *
 * @example
 * const cleanup = syncSelectedTextTrackFromDom({ state, owners });
 */
export function syncSelectedTextTrackFromDom({
  state,
  owners,
}: {
  state: WritableState<SelectedTextTrackFromDomState>;
  owners: WritableState<SelectedTextTrackFromDomOwners>;
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

    const sync = () => {
      const showingTrack = Array.from(mediaElement.textTracks).find(
        (t) => t.mode === 'showing' && (t.kind === 'subtitles' || t.kind === 'captions')
      );

      // showingTrack.id is set from the SPF presentation track ID by setupTextTracks.
      // Fall back to undefined for empty-string IDs (non-SPF-managed tracks).
      const newId = showingTrack?.id || undefined;

      // Guard against redundant patches — e.g. syncTextTrackModes confirming the
      // current selection, which would otherwise create a feedback loop.
      if (state.current.selectedTextTrackId !== newId) {
        state.patch({ selectedTextTrackId: newId });
      }
    };

    removeListener = listen(mediaElement.textTracks, 'change', sync);
  });

  return () => {
    removeListener?.();
    unsubscribe();
  };
}
