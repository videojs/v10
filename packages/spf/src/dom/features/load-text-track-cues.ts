import type { Reactor } from '../../core/create-machine-reactor';
import { createMachineReactor } from '../../core/create-machine-reactor';
import { computed, type Signal, untrack, update } from '../../core/signals/primitives';
import type { Presentation, TextTrack } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import type { TextTrackSegmentLoaderActor } from './text-track-segment-loader-actor';
import { createTextTrackSegmentLoaderActor } from './text-track-segment-loader-actor';
import type { TextTracksActor } from './text-tracks-actor';
import { createTextTracksActor } from './text-tracks-actor';

/**
 * FSM states for text track cue loading.
 *
 * ```
 * 'preconditions-unmet' ── mediaElement + presentation + text tracks ──→ 'setting-up'
 *        ↑                                                                      |
 *        │                                                             actors created
 *        │                                                             in owners
 *        │                                                                      ↓
 *        ├───────────────── preconditions lost ─────────────────────── 'pending'
 *        │                                                                      |
 *        │                                                  selectedTrack resolved + in DOM
 *        │                                                                      ↓
 *        └───────────────── preconditions lost ──────────── 'monitoring-for-loads'
 *
 * any state ──── destroy() ────→ 'destroying' ────→ 'destroyed'
 * ```
 */
export type LoadTextTrackCuesState = 'preconditions-unmet' | 'setting-up' | 'pending' | 'monitoring-for-loads';

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
 *
 * `textTracksActor` and `segmentLoaderActor` are managed by this reactor:
 * written to owners in `'setting-up'` and reset to `undefined` on entry to
 * `'preconditions-unmet'` or `'setting-up'`. Callers are responsible for
 * destroying them when the reactor itself is destroyed (actors are not
 * auto-cleaned on `destroy()` — read them from owners and destroy explicitly).
 */
export interface TextTrackCueLoadingOwners {
  mediaElement?: HTMLMediaElement | undefined;
  textTracksActor?: TextTracksActor | undefined;
  segmentLoaderActor?: TextTrackSegmentLoaderActor | undefined;
}

// ============================================================================
// Helpers
// ============================================================================

function getTextTracks(presentation: Presentation | undefined) {
  return presentation?.selectionSets?.find((s) => s.type === 'text')?.switchingSets[0]?.tracks;
}

function findSelectedTrack(state: TextTrackCueLoadingState): TextTrack | undefined {
  const track = getTextTracks(state.presentation)?.find((t) => t.id === state.selectedTextTrackId);
  return track && isResolvedTrack(track) ? track : undefined;
}

/**
 * Derives the correct state from current state and owners.
 *
 * States are mutually exclusive and exhaustive:
 * - `'preconditions-unmet'`: no mediaElement, or no resolved presentation with text tracks
 * - `'setting-up'`:          preconditions met; actors not yet in owners
 * - `'pending'`:             actors alive; no selection, or selected track not yet resolved/in DOM
 * - `'monitoring-for-loads'`: selected track resolved, in DOM — ready to dispatch load messages
 */
function deriveState(state: TextTrackCueLoadingState, owners: TextTrackCueLoadingOwners): LoadTextTrackCuesState {
  if (!owners.mediaElement || !getTextTracks(state.presentation)?.length) {
    return 'preconditions-unmet';
  }
  if (!owners.textTracksActor || !owners.segmentLoaderActor) {
    return 'setting-up';
  }
  const track = findSelectedTrack(state);
  if (!track || track.segments.length === 0) return 'pending';
  if (!Array.from(owners.mediaElement.textTracks).some((t) => t.id === state.selectedTextTrackId)) {
    return 'pending';
  }
  return 'monitoring-for-loads';
}

function teardownActors(owners: Signal<TextTrackCueLoadingOwners>) {
  const { textTracksActor, segmentLoaderActor } = untrack(() => owners.get());
  // Only update owners if there are actors to clean up — avoids spurious
  // signal writes on initial startup that would re-trigger other features.
  if (!textTracksActor && !segmentLoaderActor) return;
  textTracksActor?.destroy();
  segmentLoaderActor?.destroy();
  update(owners, { textTracksActor: undefined, segmentLoaderActor: undefined });
}

// ============================================================================
// Main export
// ============================================================================

/**
 * Text track cue loading orchestration.
 *
 * A single `always` monitor keeps the reactor in sync with conditions.
 * Actor lifecycle is managed across two states:
 *
 * - **`'setting-up'`** — creates `TextTracksActor` and `TextTrackSegmentLoaderActor`
 *   and writes them to owners. Entry resets any stale actors first.
 * - **`'preconditions-unmet'`** — destroys any actors in owners and resets them to
 *   `undefined`. Handles all paths back from active states.
 * - **`'monitoring-for-loads'`** — reactive dispatch: re-runs whenever `state`
 *   changes (selection, currentTime, presentation) and sends a `load` message to
 *   the segment loader.
 *
 * **Destroy note:** actors written to owners are NOT auto-destroyed when
 * `reactor.destroy()` is called. Callers must read them from owners and destroy
 * them explicitly alongside the reactor.
 *
 * @example
 * const reactor = loadTextTrackCues({ state, owners });
 * // later:
 * const { textTracksActor, segmentLoaderActor } = owners.get();
 * textTracksActor?.destroy();
 * segmentLoaderActor?.destroy();
 * reactor.destroy();
 */
export function loadTextTrackCues<S extends TextTrackCueLoadingState, O extends TextTrackCueLoadingOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): Reactor<LoadTextTrackCuesState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() => deriveState(state.get(), owners.get()));
  const currentTimeSignal = computed(() => state.get().currentTime ?? 0);
  const selectedTrackSignal = computed(() => findSelectedTrack(state.get()));

  return createMachineReactor<LoadTextTrackCuesState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {
        // Entry: defensive actor reset on state entry (no-op if already undefined).
        entry: () => {
          teardownActors(owners);
        },
      },

      'setting-up': {
        // Entry: reset any stale actors, then create fresh ones and write to owners.
        // The fn body is automatically untracked — no untrack() needed for mediaElement.
        entry: () => {
          teardownActors(owners);
          const mediaElement = owners.get().mediaElement as HTMLMediaElement;
          const textTracksActor = createTextTracksActor(mediaElement);
          const segmentLoaderActor = createTextTrackSegmentLoaderActor(textTracksActor);
          update(owners, { textTracksActor, segmentLoaderActor } as Partial<O>);
        },
      },

      pending: {},

      'monitoring-for-loads': {
        // Reaction: re-runs whenever currentTime or selectedTrack changes, dispatching
        // a load message to the segment loader. owners is read with untrack() since
        // actor presence is guaranteed by deriveState when in this state.
        effects: () => {
          const currentTime = currentTimeSignal.get();
          const track = selectedTrackSignal.get()!;
          // deriveState guarantees segmentLoaderActor is in owners and findSelectedTrack
          // returns a valid resolved track when in this state. The always monitor
          // (registered before this effect) transitions us out before this re-runs
          // if either invariant ever stops holding.
          const { segmentLoaderActor } = untrack(() => owners.get());
          segmentLoaderActor!.send({ type: 'load', track, currentTime });
        },
      },
    },
  });
}
