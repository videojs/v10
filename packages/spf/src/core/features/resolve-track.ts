import { fetchResolvable, getResponseText } from '../../dom/network/fetch';
import type { EventStream } from '../events/create-event-stream';
import { parseMediaPlaylist } from '../hls/parse-media-playlist';
import { combineLatest } from '../reactive/combine-latest';
import type { WritableState } from '../state/create-state';
import type { Presentation, ResolvedTrack, TrackType } from '../types';
import { isResolvedTrack } from '../types';
import { getSelectedTrack, type TrackSelectionState } from '../utils/track-selection';

/**
 * State shape for track resolution.
 */
export interface TrackResolutionState extends TrackSelectionState {
  presentation?: Presentation | undefined;
  selectedVideoTrackId?: string | undefined;
  selectedAudioTrackId?: string | undefined;
  selectedTextTrackId?: string | undefined;
}

export function canResolve<T extends TrackType>(
  state: TrackResolutionState,
  config: TrackResolutionConfig<T>
): boolean {
  const track = getSelectedTrack(state, config.type);
  if (!track) return false;

  return !isResolvedTrack(track);
}

/**
 * Determines if track resolution conditions are met.
 *
 * Currently always returns true - conditions are checked by canResolveTrack()
 * and resolving flag. Kept as placeholder for future conditional logic.
 *
 * @param state - Current track resolution state
 * @param event - Current action/event
 * @returns true (conditions checked elsewhere)
 */
export function shouldResolve(_state: TrackResolutionState, _event: TrackResolutionAction): boolean {
  return true;
}

// ============================================================================
// Task interface + implementation
// ============================================================================

/**
 * Minimal contract for a schedulable unit of async work.
 * Tasks must be identifiable, runnable, and abortable.
 */
interface Task {
  readonly id: string;
  run(): Promise<void>;
  abort(): void;
}

/**
 * Resolves a single unresolved track by fetching and parsing its media
 * playlist, then patching the presentation with the resolved track.
 *
 * The track to resolve is passed directly from the scheduling subscriber,
 * which has already determined the correct track via getSelectedTrack.
 * This keeps the task focused: it only needs the track and writable state.
 */
class TrackResolutionTask implements Task {
  readonly #abortController = new AbortController();

  // biome-ignore lint/suspicious/noExplicitAny: PartiallyResolved<T> union is unwieldy here; typed at the call site
  constructor(
    private readonly track: any,
    private readonly state: WritableState<TrackResolutionState>
  ) {
    this.id = track.id;
  }

  readonly id: string;

  async run(): Promise<void> {
    const response = await fetchResolvable(this.track, { signal: this.#abortController.signal });
    const text = await getResponseText(response);
    const mediaTrack = parseMediaPlaylist(text, this.track);

    // IMPORTANT: Read state.current.presentation at patch time, not from a
    // captured snapshot. Multiple TrackResolutionTasks may be running
    // concurrently (one per track being resolved), so the snapshot from
    // construction time may already be stale by the time a task completes —
    // a sibling task may have already patched the presentation with its own
    // resolved track. Using the snapshot would overwrite that update and lose
    // the other track's resolution. Reading live state ensures each task
    // builds on top of whatever has been committed so far.
    //
    // This is a limitation of the current architecture: tasks receive a
    // snapshot at scheduling time but need live state at write time. A future
    // improvement could dispatch resolved tracks through a single serialised
    // writer (e.g. a reducer pattern) to eliminate this hazard entirely.
    const latestPresentation = this.state.current.presentation!;
    const updatedPresentation = updateTrackInPresentation(latestPresentation, mediaTrack);
    this.state.patch({ presentation: updatedPresentation });
  }

  abort(): void {
    this.#abortController.abort();
  }
}

// ============================================================================
// Concurrent runner
// ============================================================================

/**
 * Runs tasks concurrently, keyed by an arbitrary identifier.
 *
 * Deduplicates by key — if a task for a given key is already in flight,
 * subsequent schedule() calls for that key are silently ignored until the
 * first task completes. This prevents duplicate network requests when state
 * changes fire the scheduling subscriber multiple times for the same track.
 *
 * Tasks are stored in the pending map so abortAll() can cancel any in-flight
 * work (e.g. on engine cleanup).
 */
class ConcurrentRunner {
  readonly #pending = new Map<string, Task>();

  schedule(task: Task, id: string): void {
    if (this.#pending.has(id)) return;

    this.#pending.set(id, task);
    task
      .run()
      .catch((error) => {
        if (!(error instanceof Error && error.name === 'AbortError')) throw error;
      })
      .finally(() => {
        this.#pending.delete(id);
      });
  }

  abortAll(): void {
    for (const task of this.#pending.values()) task.abort();
    this.#pending.clear();
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Updates a track within a presentation (immutably).
 * Generic - works for video, audio, or text tracks.
 */
export function updateTrackInPresentation<T extends ResolvedTrack>(
  presentation: Presentation,
  resolvedTrack: T
): Presentation {
  const trackId = resolvedTrack.id;
  return {
    ...presentation,
    selectionSets: presentation.selectionSets.map((selectionSet) => ({
      ...selectionSet,
      switchingSets: selectionSet.switchingSets.map((switchingSet) => ({
        ...switchingSet,
        tracks: switchingSet.tracks.map((track) => (track.id === trackId ? resolvedTrack : track)),
      })),
    })),
  } as Presentation;
}

/**
 * Action types for track resolution.
 * Event names match HTMLMediaElement events (lowercase).
 */
export type TrackResolutionAction = { type: 'play' } | { type: 'pause' };

/**
 * Configuration for track resolution.
 */
export interface TrackResolutionConfig<T extends TrackType = TrackType> {
  type: T;
}

/**
 * Resolves unresolved tracks using reactive composition.
 *
 * The subscribe closure is pure scheduling logic: it checks conditions and
 * creates a task for the selected track when appropriate. The ConcurrentRunner
 * handles all concurrency concerns — deduplication, parallel execution, and
 * cleanup.
 *
 * Generic version that works for video, audio, or text tracks based on config.
 * Type parameter T is inferred from config.type (use 'as const' for inference).
 */
export function resolveTrack<T extends TrackType>(
  {
    state,
    events,
  }: {
    state: WritableState<TrackResolutionState>;
    events: EventStream<TrackResolutionAction>;
  },
  config: TrackResolutionConfig<T>
): () => void {
  const runner = new ConcurrentRunner();

  const cleanup = combineLatest([state, events]).subscribe(([currentState, event]) => {
    if (!canResolve(currentState, config) || !shouldResolve(currentState, event)) return;

    const track = getSelectedTrack(currentState, config.type);
    if (!track) return;

    runner.schedule(new TrackResolutionTask(track, state), track.id);
  });

  return () => {
    runner.abortAll();
    cleanup();
  };
}
