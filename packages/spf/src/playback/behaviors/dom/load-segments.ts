/**
 * **Per-type segment loading dispatch.** Per available track type (video /
 * audio), reads the per-type `SegmentLoaderActor` from context and sends
 * typed `'load'` messages whenever a meaningful loading condition
 * changes (selected track, current time crossing a segment boundary,
 * preload, load activation).
 *
 * Loader-actor lifecycle is owned upstream by `setupVideoBufferActors` /
 * `setupAudioBufferActors`, which create the loader alongside the
 * `SourceBufferActor` and publish both to context. This behavior is
 * pure-consumer: it reads `context.xSegmentLoaderActor` and dispatches.
 *
 * # Lifecycle
 *
 * Modeled as a `createMachineReactor` with `'no-loader'` ↔ `'has-loader'`
 * gated on upstream loader-actor presence. Within `'has-loader'`, a
 * single dispatcher effect tracks `loadingInputs` and the upstream
 * loader signal; `prevInputs` dedup is reset on loader identity change
 * so a fresh loader gets an unguarded first dispatch.
 *
 * Reads `xSegmentLoaderActor` from `setupXBufferActors`.
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal } from '../../../core/signals/primitives';
import { DEFAULT_FORWARD_BUFFER_CONFIG, segmentStartForTime } from '../../../media/buffer/forward-buffer';
import type { MaybeResolvedPresentation, ResolvedTrack } from '../../../media/types';
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
// LOADING INPUTS — selector + dedup
// ============================================================================

type LoadingInputs = {
  loadActivated: boolean | undefined;
  preload: string | undefined;
  currentTime: number | undefined;
  /** @TODO cleanup type precision via inference+generics */
  track: ReturnType<typeof getSelectedTrack>;
  segmentsCanLoad: boolean;
};

function selectLoadingInputs(
  [segmentsCanLoad, state]: [boolean, SegmentLoadingState],
  type: MediaTrackType
): LoadingInputs {
  const { loadActivated, preload, currentTime } = state;
  const track = getSelectedTrack(state, type);
  return {
    loadActivated,
    preload,
    currentTime,
    track,
    segmentsCanLoad,
  };
}

/**
 * Returns true when the inputs are equal (no meaningful change — don't fire).
 *
 * Condition hierarchy:
 *
 *   !loadActivated
 *     preload === 'none'           → dormant; never fire
 *     preload changes              → fire
 *
 *   !loadActivated → loadActivated
 *     preload !== 'auto'           → fire (message shape changes)
 *     preload === 'auto'           → fall through to segment compare
 *                                    (suppress if same position — was
 *                                    already full-range mode)
 *
 *   loadActivated
 *     track.id changes             → fire
 *     segmentStart(currentTime)    → fire on segment-boundary crossing
 */
function loadingInputsEq(prevState: LoadingInputs, curState: LoadingInputs): boolean {
  if (!curState.segmentsCanLoad) return true;
  if (!curState.loadActivated) {
    if (curState.preload === 'none') return true;
    return curState.preload === prevState.preload;
  }
  if (!prevState.loadActivated && curState.loadActivated) {
    if (prevState.preload !== 'auto') return false;
  }

  if (!curState.track || !isResolvedTrack(curState.track)) return true;
  if (prevState.track?.id !== curState.track.id && isResolvedTrack(curState.track)) return false;

  return (
    segmentStartForTime(prevState.currentTime, (curState.track as ResolvedTrack).segments) ===
    segmentStartForTime(curState.currentTime, (curState.track as ResolvedTrack).segments)
  );
}

// ============================================================================
// REACTOR
// ============================================================================

type SegmentLoadingFsmState = 'no-loader' | 'has-loader';

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
  // Dedup state across dispatcher re-fires. Reset on loader identity
  // change (defensive — within-state identity change shouldn't occur
  // given `setupXBufferActors`'s state-exit/re-entry cycle separates
  // slot transitions, but the closure flag guards against it).
  let prevInputs: LoadingInputs | undefined;
  let lastLoader: SegmentLoaderActor | undefined;

  const segmentsCanLoad = computed(() => {
    const selection: TrackSelectionState = {
      presentation: state.presentation.get(),
      [selectedKey]: state[selectedKey].get(),
    };
    const track = getSelectedTrack(selection, type);
    return !!track && isResolvedTrack(track) && !!context[loaderKey].get();
  });

  const loadingInputs = computed(() => {
    const snapshot: SegmentLoadingState = {
      presentation: state.presentation.get(),
      preload: state.preload.get(),
      currentTime: state.currentTime.get(),
      loadActivated: state.loadActivated.get(),
      [selectedKey]: state[selectedKey].get(),
    };
    return selectLoadingInputs([segmentsCanLoad.get(), snapshot], type);
  });

  const derivedStateSignal = computed<SegmentLoadingFsmState>(() =>
    context[loaderKey].get() ? 'has-loader' : 'no-loader'
  );

  return createMachineReactor<SegmentLoadingFsmState>({
    initial: 'no-loader',
    monitor: () => derivedStateSignal.get(),
    states: {
      'no-loader': {},

      'has-loader': {
        effects: () => {
          const loader = context[loaderKey].get();
          if (!loader) return;
          // Reset dedup on loader identity change. State-exit/re-entry
          // through `'no-loader'` is the typical path (slot flips
          // undefined → new value via setupXBufferActors's state
          // machine), but the closure guard handles the same-runPending
          // case defensively.
          if (loader !== lastLoader) {
            prevInputs = undefined;
            lastLoader = loader;
          }
          const inputs = loadingInputs.get();
          if (prevInputs !== undefined && loadingInputsEq(prevInputs, inputs)) return;

          const { preload, loadActivated, currentTime, track, segmentsCanLoad: canLoad } = inputs;
          if (!canLoad) return;

          prevInputs = inputs;

          const fullMode = preload === 'auto' || !!loadActivated;
          if (!fullMode) {
            // Metadata mode: init only, no range.
            /** @ts-expect-error */
            loader.send({ type: 'load', track });
          } else {
            loader.send({
              type: 'load',
              /** @ts-expect-error */
              track,
              range: {
                start: currentTime as number,
                end: (currentTime as number) + DEFAULT_FORWARD_BUFFER_CONFIG.bufferDuration,
              },
            });
          }
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
