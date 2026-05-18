/**
 * **Per-type segment loading dispatch.** Per available track type (video /
 * audio), reads the per-type `SegmentLoaderActor` from context and sends
 * typed `'load'` messages whenever a meaningful loading condition changes
 * (selected track, current time crossing a segment boundary).
 *
 * Loader-actor lifecycle is owned upstream by `setupVideoBufferActors` /
 * `setupAudioBufferActors`, which create the loader alongside the
 * `SourceBufferActor` and publish both to context. This behavior is
 * pure-consumer: it reads `context.xSegmentLoaderActor` and dispatches.
 *
 * # Load modes as reactor states
 *
 * Four states encode the load-gating policy directly, replacing the prior
 * `loadingInputsEq` + `prevInputs` hand-rolled discriminator over a flat
 * dispatcher effect:
 *
 * - `'preconditions-unmet'` — no loader actor in context, or the selected
 *   track hasn't resolved to a track with segments.
 * - `'dormant'` — `preload === 'none' && !loadActivated`. Nothing fires;
 *   media + init are gated behind explicit activation.
 * - `'metadata-only'` — `!loadActivated && preload !== 'auto' && preload !== 'none'`.
 *   Covers `preload === 'metadata'` and the undefined-preload default. Fires
 *   an init-segment-only `load` message (no `range`) **once on entry**;
 *   selection changes while still in this state are intentionally not
 *   followed. Matches HTMLMediaElement's `preload='metadata'` semantics
 *   (surface enough info to populate metadata for the entry-time selection)
 *   and avoids wasted init fetches when the user reselects a track three
 *   times before pressing play. The eventual `'full-range'` entry handles
 *   whichever track is actually selected at playback start.
 * - `'full-range'` — `loadActivated || preload === 'auto'`. Effect re-fires
 *   on selected-track change and on segment-boundary crossing (a `computed`
 *   over `segmentStartForTime(currentTime, segments)` dedups within-segment
 *   `currentTime` ticks via signal-polyfill's default `Object.is` equality).
 *
 * Mode flips (`preload` changes, `loadActivated` true↔false) drive state
 * transitions; within-mode refinements (track change, time tick) are tracked
 * inside the active state's `effects:`. The `prevInputs` closure variable
 * and `loadingInputsEq` equality function dissolve.
 *
 * # Source-reset
 *
 * Loader-actor identity changes are observed via `'preconditions-unmet'`
 * transitions (the setup-actor behavior nulls the slot on state exit, the
 * reactor's `monitor` returns `'preconditions-unmet'`, and re-entry to a
 * positive state on the next loader fires a fresh dispatch). No closure
 * state, no defensive identity guard.
 *
 * Reads `xSegmentLoaderActor` from `setupXBufferActors`.
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal } from '../../../core/signals/primitives';
import { DEFAULT_FORWARD_BUFFER_CONFIG, segmentStartForTime } from '../../../media/buffer/forward-buffer';
import type { AudioTrack, MaybeResolvedPresentation, VideoTrack } from '../../../media/types';
import { isResolvedTrack } from '../../../media/types';
import { getSelectedTrack, type TrackSelectionState } from '../../../media/utils/track-selection';
import type { BufferState, SegmentLoaderActor, SourceBufferState } from '../../actors/dom/segment-loader';
import type { MediaTrackType } from './setup-buffer-actors';

// Re-export buffer state types for consumers that import them from this module.
export type { BufferState, SourceBufferState };

// ============================================================================
// STATE & CONTEXT
// ============================================================================

/**
 * State shape for segment loading.
 */
export interface SegmentLoadingState extends TrackSelectionState {
  presentation?: MaybeResolvedPresentation;
  preload?: string;
  /** Current playback position in seconds. Defaults to 0 when undefined. */
  currentTime?: number;
  /** True once a preload-overriding event has fired for the current source. Allows full segment loading regardless of preload setting. */
  loadActivated?: boolean;
}

/**
 * Context shape for segment loading. Each per-type variant only consumes
 * its own type's loader actor; the helper is parameterized over one
 * `loaderActor` slot.
 */
export interface SegmentLoadingContext {
  videoSegmentLoaderActor?: SegmentLoaderActor;
  audioSegmentLoaderActor?: SegmentLoaderActor;
}

// ============================================================================
// REACTOR
// ============================================================================

type SegmentLoadingFsmState = 'preconditions-unmet' | 'dormant' | 'metadata-only' | 'full-range';

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId';
type SegmentLoaderActorKey = 'videoSegmentLoaderActor' | 'audioSegmentLoaderActor';

type SegmentLoadingStateMap<K extends SelectedTrackKey> = {
  presentation: ReadonlySignal<SegmentLoadingState['presentation']>;
  preload: ReadonlySignal<SegmentLoadingState['preload']>;
  currentTime: ReadonlySignal<SegmentLoadingState['currentTime']>;
  loadActivated: ReadonlySignal<SegmentLoadingState['loadActivated']>;
} & { [P in K]: ReadonlySignal<SegmentLoadingState[P]> };

type SegmentLoadingContextMap<L extends SegmentLoaderActorKey> = {
  [P in L]: ReadonlySignal<SegmentLoaderActor | undefined>;
};

/**
 * Specialization helper. Per-type variants (`loadVideoSegments` /
 * `loadAudioSegments`) call this from inside their own `defineBehavior`
 * setup, passing their narrowed `state` / `context` through directly and
 * supplying the per-type `selectedKey`, `loaderKey`, and `type`
 * discriminator inline.
 */
function setupSegmentLoading<K extends SelectedTrackKey, L extends SegmentLoaderActorKey>({
  state,
  context,
  config: { type, selectedKey, loaderKey },
}: {
  state: SegmentLoadingStateMap<K>;
  context: SegmentLoadingContextMap<L>;
  config: {
    type: MediaTrackType;
    selectedKey: K;
    loaderKey: L;
  };
}): Reactor<SegmentLoadingFsmState | 'destroying' | 'destroyed'> {
  const selectedTrackSignal = computed<VideoTrack | AudioTrack | undefined>(() => {
    const selection: TrackSelectionState = {
      presentation: state.presentation.get(),
      [selectedKey]: state[selectedKey].get(),
    };
    const track = getSelectedTrack(selection, type);
    return track && isResolvedTrack(track) ? track : undefined;
  });

  // Segment-boundary signal — `segmentStartForTime` returns the same number
  // while `currentTime` stays inside one segment, so signal-polyfill's
  // `Object.is` equality on this computed dedups within-segment ticks. The
  // `'full-range'` effect tracks this signal (rather than `currentTime`
  // directly) so it only re-fires on boundary crossings.
  const segmentBoundarySignal = computed(() => {
    const track = selectedTrackSignal.get();
    if (!track) return undefined;
    return segmentStartForTime(state.currentTime.get() ?? 0, track.segments);
  });

  const derivedStateSignal = computed<SegmentLoadingFsmState>(() => {
    if (!context[loaderKey].get() || !selectedTrackSignal.get()) return 'preconditions-unmet';
    if (state.loadActivated.get() || state.preload.get() === 'auto') return 'full-range';
    if (state.preload.get() === 'none') return 'dormant';
    return 'metadata-only';
  });

  return createMachineReactor<SegmentLoadingFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},
      dormant: {},
      'metadata-only': {
        // Fires once on entry. Matches HTMLMediaElement's preload='metadata'
        // semantics — load enough to surface metadata for the selected track
        // at entry time. Selection changes while still in `'metadata-only'`
        // (a pre-play edge case) are intentionally not followed: the
        // eventual `'full-range'` entry handles whichever track is actually
        // selected when playback starts, and the actor's `load` handler
        // fetches a new init only when committed initTrackId disagrees.
        entry: () => {
          const track = selectedTrackSignal.get()!;
          context[loaderKey].get()!.send({ type: 'load', track });
        },
      },
      'full-range': {
        // Re-fires on selected-track changes (`selectedTrackSignal`) and on
        // segment-boundary crossings (`segmentBoundarySignal`). The loader
        // actor reference is peeked — its presence is a state invariant.
        // `currentTime` is peeked too: the boundary-dedup signal already
        // handles re-firing policy; we just want the live value at dispatch
        // time so the forward-buffer window anchors correctly.
        effects: () => {
          const track = selectedTrackSignal.get()!;
          segmentBoundarySignal.get();
          const currentTime = peek(state.currentTime) ?? 0;
          peek(context[loaderKey])!.send({
            type: 'load',
            track,
            range: {
              start: currentTime,
              end: currentTime + DEFAULT_FORWARD_BUFFER_CONFIG.bufferDuration,
            },
          });
        },
      },
    },
  });
}

// ============================================================================
// Specialized exports — one per media type
// ============================================================================

/**
 * Load video segments — reads the video `SegmentLoaderActor` published
 * by `setupVideoBufferActors` and dispatches typed `'load'` messages
 * based on preload / loadActivated / currentTime / selected track.
 * Bandwidth sampling for ABR is owned upstream by
 * `setupVideoBufferActors`.
 */
export const loadVideoSegments = defineBehavior({
  stateKeys: ['presentation', 'preload', 'currentTime', 'loadActivated', 'selectedVideoTrackId'],
  contextKeys: ['videoSegmentLoaderActor'],
  setup: ({
    state,
    context,
  }: {
    state: SegmentLoadingStateMap<'selectedVideoTrackId'>;
    context: {
      videoSegmentLoaderActor: ReadonlySignal<SegmentLoadingContext['videoSegmentLoaderActor']>;
    };
  }) =>
    setupSegmentLoading({
      state,
      context,
      config: {
        type: 'video',
        selectedKey: 'selectedVideoTrackId',
        loaderKey: 'videoSegmentLoaderActor',
      },
    }),
});

/**
 * Load audio segments — same dispatch shape as `loadVideoSegments`,
 * narrowed to audio. Reads the audio `SegmentLoaderActor` published by
 * `setupAudioBufferActors`.
 */
export const loadAudioSegments = defineBehavior({
  stateKeys: ['presentation', 'preload', 'currentTime', 'loadActivated', 'selectedAudioTrackId'],
  contextKeys: ['audioSegmentLoaderActor'],
  setup: ({
    state,
    context,
  }: {
    state: SegmentLoadingStateMap<'selectedAudioTrackId'>;
    context: {
      audioSegmentLoaderActor: ReadonlySignal<SegmentLoadingContext['audioSegmentLoaderActor']>;
    };
  }) =>
    setupSegmentLoading({
      state,
      context,
      config: {
        type: 'audio',
        selectedKey: 'selectedAudioTrackId',
        loaderKey: 'audioSegmentLoaderActor',
      },
    }),
});
