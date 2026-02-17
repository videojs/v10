import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';

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
 * Check if we can sync text track modes.
 *
 * Requires:
 * - textTracks map exists (track elements created)
 */
export function canSyncTextTrackModes(owners: TextTrackModeOwners): boolean {
  return !!owners.textTracks && owners.textTracks.size > 0;
}

/**
 * Text track mode sync task (module-level, pure).
 * Sets track element modes based on selection.
 */
const syncTextTrackModesTask = async (
  { currentState, currentOwners }: { currentState: TextTrackModeState; currentOwners: TextTrackModeOwners },
  _context: {}
): Promise<void> => {
  const selectedId = currentState.selectedTextTrackId;

  // Update all track element modes
  for (const [trackId, trackElement] of currentOwners.textTracks!) {
    if (trackId === selectedId) {
      // Selected track: show it
      trackElement.track.mode = 'showing';
    } else {
      // Other tracks: hide them (but keep available in menu)
      trackElement.track.mode = 'hidden';
    }
  }
};

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
export function syncTextTrackModes({
  state,
  owners,
}: {
  state: WritableState<TextTrackModeState>;
  owners: WritableState<TextTrackModeOwners>;
}): () => void {
  return combineLatest([state, owners]).subscribe(
    async ([currentState, currentOwners]: [TextTrackModeState, TextTrackModeOwners]) => {
      // Check orchestration conditions
      if (!canSyncTextTrackModes(currentOwners)) return;

      // Execute task
      await syncTextTrackModesTask({ currentState, currentOwners }, {});
    }
  );
}
