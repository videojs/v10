import { Signal } from 'signal-polyfill';
import { effect } from '../../core/signals/effect';

/**
 * State shape for text track mode synchronization.
 */
export interface TextTrackModeState {
  selectedTextTrackId?: string | undefined;
}

/**
 * Owners shape for text track mode synchronization.
 */
export interface TextTrackModeOwners {
  textTracks?: Map<string, HTMLTrackElement>;
}

/**
 * Sync text track modes orchestration.
 *
 * Manages track element modes based on selectedTextTrackId:
 * - Selected track: mode = "showing"
 * - Other tracks: mode = "hidden"
 * - No selection: all tracks mode = "hidden"
 *
 * Note: Uses "hidden" instead of "disabled" for non-selected tracks
 * so they remain available in the browser's track menu.
 *
 * @example
 * const cleanup = syncTextTrackModes({ state, owners });
 */
export function syncTextTrackModes<S extends TextTrackModeState, O extends TextTrackModeOwners>({
  state,
  owners,
}: {
  state: Signal.State<S>;
  owners: Signal.State<O>;
}): () => void {
  const textTracksSignal = new Signal.Computed(() => owners.get().textTracks);
  const selectedTextTrackIdSignal = new Signal.Computed(() => state.get().selectedTextTrackId);

  const canSyncTextTrackModes = new Signal.Computed(() => !!textTracksSignal.get()?.size);

  return effect(() => {
    if (!canSyncTextTrackModes.get()) return;
    /** @TODO refactor TextTracks owners model. Should simply use id. Also should use corresponding TextTrack (JS) element if possible (CJP) */
    const textTracks = textTracksSignal.get() as Map<string, HTMLTrackElement>;
    const selectedTextTrackId = selectedTextTrackIdSignal.get() as string;

    for (const [trackId, trackElement] of textTracks) {
      trackElement.track.mode = trackId === selectedTextTrackId ? 'showing' : 'hidden';
    }
  });
}
