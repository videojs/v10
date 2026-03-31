import { effect } from '../../core/signals/effect';
import { computed, type Signal } from '../../core/signals/primitives';
import type { Presentation, TextTrack } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { TextTrackSegmentLoaderActor } from './text-track-segment-loader-actor';
import { TextTracksActor } from './text-tracks-actor';

// ============================================================================
// STATE & OWNERS
// ============================================================================

/**
 * State shape for text track cue loading.
 */
export interface TextTrackCueLoadingState {
  selectedTextTrackId?: string;
  presentation?: Presentation;
  /** Current playback position — used to gate VTT segment fetching to the forward buffer window. */
  currentTime?: number;
}

/**
 * Owners shape for text track cue loading.
 */
export interface TextTrackCueLoadingOwners {
  mediaElement?: HTMLMediaElement | undefined;
}

/**
 * Find the selected text track in the presentation.
 */
function findSelectedTextTrack(state: TextTrackCueLoadingState): TextTrack | undefined {
  if (!state.presentation || !state.selectedTextTrackId) {
    return undefined;
  }

  const textSet = state.presentation.selectionSets.find((set) => set.type === 'text');
  if (!textSet?.switchingSets?.[0]?.tracks) {
    return undefined;
  }

  const track = textSet.switchingSets[0].tracks.find((t) => t.id === state.selectedTextTrackId);

  return track as TextTrack | undefined;
}

/**
 * Get the browser's TextTrack object for the selected text track.
 */
function getSelectedTextTrackFromOwners(
  state: TextTrackCueLoadingState,
  owners: TextTrackCueLoadingOwners
): globalThis.TextTrack | undefined {
  const trackId = state.selectedTextTrackId;
  if (!trackId || !owners.mediaElement) {
    return undefined;
  }

  return Array.from(owners.mediaElement.textTracks).find((t) => t.id === trackId);
}

/**
 * Check if we can load text track cues.
 */
export function canLoadTextTrackCues(state: TextTrackCueLoadingState, owners: TextTrackCueLoadingOwners): boolean {
  return (
    !!state.selectedTextTrackId &&
    !!owners.mediaElement &&
    Array.from(owners.mediaElement.textTracks).some((t) => t.id === state.selectedTextTrackId)
  );
}

/**
 * Check if we should load text track cues.
 */
export function shouldLoadTextTrackCues(state: TextTrackCueLoadingState, owners: TextTrackCueLoadingOwners): boolean {
  if (!canLoadTextTrackCues(state, owners)) {
    return false;
  }

  const track = findSelectedTextTrack(state);
  if (!track || !isResolvedTrack(track) || track.segments.length === 0) {
    return false;
  }

  const textTrack = getSelectedTextTrackFromOwners(state, owners);
  if (!textTrack) {
    return false;
  }

  return true;
}

/**
 * Load text track cues orchestration.
 *
 * @example
 * const cleanup = loadTextTrackCues({ state, owners });
 */
export function loadTextTrackCues<S extends TextTrackCueLoadingState, O extends TextTrackCueLoadingOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): () => void {
  // Actor lifecycle: both actors are tied to the mediaElement.
  // Recreated together when mediaElement changes.
  let textTracksActor: TextTracksActor | undefined;
  let segmentLoaderActor: TextTrackSegmentLoaderActor | undefined;
  let actorMediaElement: HTMLMediaElement | undefined;

  const mediaElement = computed(() => owners.get().mediaElement);

  const cleanupEffect = effect(() => {
    const s = state.get();
    const o = owners.get();

    // Manage actor lifecycle when mediaElement changes.
    const currentMediaElement = mediaElement.get();
    if (currentMediaElement !== actorMediaElement) {
      textTracksActor?.destroy();
      segmentLoaderActor?.destroy();
      if (currentMediaElement) {
        textTracksActor = new TextTracksActor(currentMediaElement);
        segmentLoaderActor = new TextTrackSegmentLoaderActor(textTracksActor);
      } else {
        textTracksActor = undefined;
        segmentLoaderActor = undefined;
      }
      actorMediaElement = currentMediaElement;
    }

    if (!segmentLoaderActor) return;
    if (!shouldLoadTextTrackCues(s, o)) return;

    const track = findSelectedTextTrack(s);
    if (!track || !isResolvedTrack(track)) return;

    segmentLoaderActor.send({ type: 'load', track, currentTime: s.currentTime ?? 0 });
  });

  return () => {
    textTracksActor?.destroy();
    segmentLoaderActor?.destroy();
    cleanupEffect();
  };
}
