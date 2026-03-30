import { listen } from '@videojs/utils/dom';
import { effect } from '../../core/signals/effect';
import { computed, type Signal, update } from '../../core/signals/primitives';
import type { TextTrackBufferState } from './load-text-track-cues';

/**
 * State shape for DOM-driven text track selection.
 */
export interface SelectedTextTrackFromDomState {
  selectedTextTrackId?: string | undefined;
  textBufferState?: TextTrackBufferState | undefined;
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
 * `selectedTextTrackId` is cleared along with the deselected track's
 * `textBufferState` entry — setting mode to 'disabled' clears native cues from
 * the track element, so the buffer must be reset to re-fetch cues on re-enable.
 *
 * @example
 * const cleanup = syncSelectedTextTrackFromDom({ state, owners });
 */
export function syncSelectedTextTrackFromDom<
  S extends SelectedTextTrackFromDomState,
  O extends SelectedTextTrackFromDomOwners,
>({ state, owners }: { state: Signal<S>; owners: Signal<O> }): () => void {
  const mediaElement = computed(() => owners.get().mediaElement);

  return effect(() => {
    const el = mediaElement.get();
    if (!el) return;

    return listen(el.textTracks, 'change', () => {
      const showingTrack = Array.from(el.textTracks).find(
        (t) => t.mode === 'showing' && (t.kind === 'subtitles' || t.kind === 'captions')
      );

      // showingTrack.id is set from the SPF presentation track ID by setupTextTracks.
      // Fall back to undefined for empty-string IDs (non-SPF-managed tracks).
      const newId = showingTrack?.id || undefined;
      const current = state.get();

      // Guard against redundant writes — e.g. syncTextTrackModes confirming the
      // current selection, which would otherwise create a feedback loop.
      if (current.selectedTextTrackId === newId) return;

      if (newId) {
        const patch: Partial<SelectedTextTrackFromDomState> = { selectedTextTrackId: newId };
        update(state, patch);
      } else {
        // When deselecting, clear the textBufferState entry for the previous track.
        // Setting mode to 'disabled' (as toggleSubtitles() does) clears native cues
        // from the track element, so the buffer must be reset to allow re-fetching
        // on re-enable.
        const prevId = current.selectedTextTrackId;
        if (prevId && current.textBufferState?.[prevId]) {
          const next = { ...current.textBufferState };
          delete next[prevId];
          const patch: Partial<SelectedTextTrackFromDomState> = {
            selectedTextTrackId: undefined,
            textBufferState: next,
          };
          update(state, patch);
        } else {
          const patch: Partial<SelectedTextTrackFromDomState> = { selectedTextTrackId: undefined };
          update(state, patch);
        }
      }
    });
  });
}
