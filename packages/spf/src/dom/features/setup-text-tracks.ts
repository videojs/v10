import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { PartiallyResolvedTextTrack, Presentation } from '../../core/types';

/**
 * State shape for text track setup.
 */
export interface TextTrackState {
  presentation?: Presentation;
  selectedTextTrackId?: string;
}

/**
 * Owners shape for text track setup.
 */
export interface TextTrackOwners {
  mediaElement?: HTMLMediaElement;
  textTracks?: Map<string, HTMLTrackElement>;
}

/**
 * Get all text tracks from presentation.
 */
function getTextTracks(presentation?: Presentation): PartiallyResolvedTextTrack[] {
  if (!presentation?.selectionSets) return [];

  const textSet = presentation.selectionSets.find((set) => set.type === 'text');
  if (!textSet?.switchingSets?.[0]?.tracks) return [];

  return textSet.switchingSets[0].tracks as PartiallyResolvedTextTrack[];
}

/**
 * Check if we can setup text tracks.
 *
 * Requires:
 * - mediaElement exists
 * - presentation is resolved (has selectionSets)
 */
export function canSetupTextTracks(state: TextTrackState, owners: TextTrackOwners): boolean {
  return !!owners.mediaElement && !!state.presentation?.selectionSets;
}

/**
 * Check if we should setup text tracks (not already set up).
 */
export function shouldSetupTextTracks(owners: TextTrackOwners): boolean {
  return !owners.textTracks;
}

/**
 * Create a track element for a text track.
 *
 * Note: We use DOM <track> elements instead of the TextTrack JS API
 * because there's no way to remove TextTracks added via addTextTrack().
 */
function createTrackElement(track: PartiallyResolvedTextTrack): HTMLTrackElement {
  const trackElement = document.createElement('track');

  trackElement.kind = track.kind;
  trackElement.label = track.label;

  if (track.language) {
    trackElement.srclang = track.language;
  }

  if (track.default) {
    trackElement.default = true;
  }

  // Store track ID for lookup
  trackElement.dataset.trackId = track.id;

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
export function setupTextTracks({
  state,
  owners,
}: {
  state: WritableState<TextTrackState>;
  owners: WritableState<TextTrackOwners>;
}): () => void {
  let hasSetup = false;
  let createdTracks: HTMLTrackElement[] = [];

  const unsubscribe = combineLatest([state, owners]).subscribe(([s, o]: [TextTrackState, TextTrackOwners]) => {
    // Check orchestration conditions
    if (hasSetup) return; // Only run once
    if (!canSetupTextTracks(s, o) || !shouldSetupTextTracks(o)) return;

    // Mark as setup before doing any work to prevent re-entry
    hasSetup = true;

    const textTracks = getTextTracks(s.presentation);
    if (textTracks.length === 0) return;

    const trackMap = new Map<string, HTMLTrackElement>();

    // Create track elements for all text tracks
    for (const track of textTracks) {
      const trackElement = createTrackElement(track);
      o.mediaElement!.appendChild(trackElement);
      trackMap.set(track.id, trackElement);
      createdTracks.push(trackElement);
    }

    // Update owners with track element map
    owners.patch({ textTracks: trackMap });
  });

  // Return cleanup function
  return () => {
    // Remove all created track elements
    for (const trackElement of createdTracks) {
      trackElement.remove();
    }
    createdTracks = [];
    unsubscribe();
  };
}
