import { getSegmentsToLoad } from '../../core/buffer/forward-buffer';
import { effect } from '../../core/signals/effect';
import { computed, type Signal } from '../../core/signals/primitives';
import type { Presentation, Segment, TextTrack } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { parseVttSegment } from '../text/parse-vtt-segment';
import { TextTracksActor } from './text-tracks-actor';

const loadVttSegmentTask = async (
  { segment, trackId }: { segment: Segment; trackId: string },
  { textTrack, actor }: { textTrack: globalThis.TextTrack; actor: TextTracksActor }
): Promise<void> => {
  const cues = await parseVttSegment(segment.url);
  actor.send({ type: 'add-cues', trackId, segmentId: segment.id, cues });
};

// ============================================================================
// MAIN TASK (composite - orchestrates subtasks)
// ============================================================================

/**
 * Load text track cues task (composite - orchestrates VTT segment subtasks).
 */
const loadTextTrackCuesTask = async <S extends TextTrackCueLoadingState>(
  { currentState }: { currentState: S },
  context: {
    signal: AbortSignal;
    textTrack: globalThis.TextTrack;
    actor: TextTracksActor;
  }
): Promise<void> => {
  const track = findSelectedTextTrack(currentState);
  if (!track || !isResolvedTrack(track)) return;

  const { segments } = track;
  if (segments.length === 0) return;

  const trackId = track.id;

  const loadedIds = new Set((context.actor.snapshot.get().context.segments[trackId] ?? []).map((s) => s.id));
  const alreadyLoaded = segments.filter((s) => loadedIds.has(s.id));

  const currentTime = currentState.currentTime ?? 0;
  const segmentsToLoad = getSegmentsToLoad(segments, alreadyLoaded, currentTime).filter((s) => !loadedIds.has(s.id));

  if (segmentsToLoad.length === 0) return;

  for (const segment of segmentsToLoad) {
    if (context.signal.aborted) break;

    try {
      await loadVttSegmentTask({ segment, trackId }, { textTrack: context.textTrack, actor: context.actor });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') break;
      console.error('Failed to load VTT segment:', error);
      // Continue to next segment (graceful degradation)
    }
  }

  // Chrome bug: after a track goes through mode='disabled' (which clears cues) and back
  // to 'showing', cues added to the track aren't activated. Re-adding all cues forces
  // Chrome to re-process them. Safe no-op in other browsers.
  // Mirrors the workaround in HlsMediaTextTracksMixin (packages/core/src/dom/media/hls/text-tracks.ts).
  if (context.textTrack.mode === 'showing' && context.textTrack.cues) {
    Array.from(context.textTrack.cues).forEach((cue) => {
      context.textTrack.addCue(cue);
    });
  }

  // Wait a frame before completing to allow state updates to flush
  await new Promise((resolve) => requestAnimationFrame(resolve));
};

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
  mediaElement?: HTMLMediaElement;
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
  let currentTask: Promise<void> | null = null;
  let abortController: AbortController | null = null;
  let lastTrackId: string | undefined;

  // Actor lifecycle: tied to the mediaElement. Recreated when mediaElement changes.
  let actor: TextTracksActor | undefined;
  let actorMediaElement: HTMLMediaElement | undefined;

  const selectedTrackId = computed(() => state.get().selectedTextTrackId);
  const mediaElement = computed(() => owners.get().mediaElement);

  const cleanupEffect = effect(() => {
    const s = state.get();
    const o = owners.get();

    // Manage actor lifecycle when mediaElement changes.
    const currentMediaElement = mediaElement.get();
    if (currentMediaElement !== actorMediaElement) {
      actor?.destroy();
      actor = currentMediaElement ? new TextTracksActor(currentMediaElement) : undefined;
      actorMediaElement = currentMediaElement;
    }

    if (selectedTrackId.get() !== lastTrackId) {
      lastTrackId = selectedTrackId.get();
      abortController?.abort();
      currentTask = null;
    }

    if (currentTask) return;
    if (!actor) return;
    if (!shouldLoadTextTrackCues(s, o)) return;

    const textTrack = getSelectedTextTrackFromOwners(s, o);
    if (!textTrack) return;

    const currentActor = actor;
    abortController = new AbortController();
    currentTask = loadTextTrackCuesTask(
      { currentState: s },
      { signal: abortController.signal, textTrack, actor: currentActor }
    ).finally(() => {
      currentTask = null;
    });
  });

  return () => {
    abortController?.abort();
    actor?.destroy();
    cleanupEffect();
  };
}
