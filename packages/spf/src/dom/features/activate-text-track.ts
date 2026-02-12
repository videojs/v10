import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';

/**
 * State shape for text track activation.
 */
export interface TextTrackActivationState {
  selectedTextTrackId?: string;
}

/**
 * Owners shape for text track activation.
 */
export interface TextTrackActivationOwners {
  textTracks?: Map<string, HTMLTrackElement>;
}

/**
 * Check if we can activate text tracks.
 *
 * Requires:
 * - textTracks map exists (track elements created)
 */
export function canActivateTextTrack(owners: TextTrackActivationOwners): boolean {
  return !!owners.textTracks && owners.textTracks.size > 0;
}

/**
 * Activate text track orchestration.
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
 * const cleanup = activateTextTrack({ state, owners });
 */
export function activateTextTrack({
  state,
  owners,
}: {
  state: WritableState<TextTrackActivationState>;
  owners: WritableState<TextTrackActivationOwners>;
}): () => void {
  return combineLatest([state, owners]).subscribe(([s, o]: [TextTrackActivationState, TextTrackActivationOwners]) => {
    // Check orchestration conditions
    if (!canActivateTextTrack(o)) return;

    const selectedId = s.selectedTextTrackId;

    // Update all track element modes
    for (const [trackId, trackElement] of o.textTracks!) {
      if (trackId === selectedId) {
        // Selected track: show it
        trackElement.track.mode = 'showing';
      } else {
        // Other tracks: hide them (but keep available in menu)
        trackElement.track.mode = 'hidden';
      }
    }
  });
}
