import { type ContextSignals, defineBehavior, type StateSignals } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import { computed, type Signal, signal } from '../../../core/signals/primitives';
import { type BandwidthState, sampleBandwidth } from '../../../media/abr/bandwidth-estimator';
import { DEFAULT_FORWARD_BUFFER_CONFIG } from '../../../media/buffer/forward-buffer';
import type { AddressableObject, MaybeResolvedPresentation, ResolvedTrack } from '../../../media/types';
import { isResolvedTrack } from '../../../media/types';
import { getSelectedTrack, type TrackSelectionState } from '../../../media/utils/track-selection';
import { ChunkedStreamIterable, type ChunkedStreamIterableOptions } from '../../../network/chunked-stream-iterable';
import { fetchResolvable } from '../../../network/fetch';
import {
  type BufferState,
  createSegmentLoaderActor,
  type SegmentLoaderActor,
  type SourceBufferState,
} from '../../actors/dom/segment-loader';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';
import type { MediaTrackType } from './setup-sourcebuffer';

// Re-export buffer state types for consumers that import them from this module.
export type { BufferState, SourceBufferState };

// Map track type to SourceBufferActor context property key.
const ActorKeyByType = {
  video: 'videoBufferActor',
  audio: 'audioBufferActor',
} as const;

// ============================================================================
// TRACKED FETCH
// ============================================================================

/**
 * Creates a fetch function that eagerly starts the HTTP request (TTFB is
 * awaited), then returns a lazy iterable over the response body that
 * transparently samples bandwidth per chunk.
 *
 * Separating connection start from body reading ensures `fetch()` is called
 * as soon as the task begins — not deferred until the actor's append loop
 * first pulls a chunk. This makes fetch timing predictable and observable
 * (e.g. in tests that record fetched URLs) regardless of downstream consumers.
 *
 * `onSample` bridges throughput state outward; see Phase 2 comment for detail.
 */
type FetchOptions = RequestInit & ChunkedStreamIterableOptions;

function createTrackedFetch(
  throughput: Signal<BandwidthState>,
  onSample?: (next: BandwidthState) => void
): (addressable: AddressableObject, options?: FetchOptions) => Promise<AsyncIterable<Uint8Array>> {
  return async (addressable, options) => {
    const { minChunkSize, ...fetchOptions } = options ?? {};
    const response = await fetchResolvable(addressable, fetchOptions);
    if (!response.body) throw new Error('Response has no body');
    const body = response.body;
    return {
      [Symbol.asyncIterator]: async function* () {
        let chunkStart = performance.now();
        for await (const chunk of new ChunkedStreamIterable(
          body,
          ...(minChunkSize !== undefined ? [{ minChunkSize }] : [])
        )) {
          const elapsed = performance.now() - chunkStart;
          const next = sampleBandwidth(throughput.get(), elapsed, chunk.byteLength);
          throughput.set(next);
          onSample?.(next);
          yield chunk;
          chunkStart = performance.now();
        }
      },
    };
  };
}

/**
 * Non-tracking fetch: eagerly starts the request and returns the response body
 * as a lazy chunk iterable. Used for audio tracks which don't sample bandwidth.
 * Pass `minChunkSize: Infinity` to accumulate the full body as a single chunk
 * (equivalent to arrayBuffer() but through the same streaming path).
 */
async function fetchStream(addressable: AddressableObject, options?: FetchOptions): Promise<AsyncIterable<Uint8Array>> {
  const { minChunkSize, ...fetchOptions } = options ?? {};
  const response = await fetchResolvable(addressable, fetchOptions);
  if (!response.body) throw new Error('Response has no body');
  return new ChunkedStreamIterable(response.body, ...(minChunkSize !== undefined ? [{ minChunkSize }] : []));
}

// ============================================================================
// STATE & CONTEXT
// ============================================================================

/**
 * State shape for segment loading.
 */
export interface SegmentLoadingState extends TrackSelectionState {
  presentation?: MaybeResolvedPresentation;
  preload?: string;
  bandwidthState?: BandwidthState;
  /** Current playback position in seconds. Defaults to 0 when undefined. */
  currentTime?: number;
  /** True once the user has initiated playback. Allows segment loading regardless of preload setting. */
  playbackInitiated?: boolean;
}

/**
 * Context shape for segment loading.
 */
export interface SegmentLoadingContext {
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
}

// ============================================================================
// STATE SELECTOR
// ============================================================================

/**
 * The subset of state that drives segment loading decisions.
 * A plain "pick" with one derived field (resolved track ID).
 */
type LoadingInputs = {
  playbackInitiated: boolean | undefined;
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
  const { playbackInitiated, preload, currentTime } = state;
  const track = getSelectedTrack(state, type);
  return {
    playbackInitiated,
    preload,
    currentTime,
    track,
    segmentsCanLoad,
  };
}

/**
 * Equality function encoding the condition hierarchy for relevant changes.
 *
 * Pre-play (!playbackInitiated):
 *   Only preload changes matter. currentTime and resolvedTrackId are ignored
 *   (track changes not supported pre-play; currentTime value is used at
 *   trigger time but changes don't re-trigger).
 *
 * playbackInitiated transition:
 *   Always fires (handled in the subscriber; preload='auto' suppression
 *   applied there since equality functions have no memory of prior values).
 *
 * Post-play (playbackInitiated):
 *   resolvedTrackId changes (track switch or previously-unresolved track
 *   resolving) and currentTime changes both trigger. preload is irrelevant.
 */
const segmentStartFor = (currentTime: number | undefined, track: ResolvedTrack | undefined) => {
  if (currentTime == null) return undefined;
  return track?.segments.find(
    ({ startTime, duration }, i, segments) =>
      currentTime >= startTime && (currentTime < startTime + duration || i === segments.length - 1)
  )?.startTime;
};

/**
 * Returns true when the inputs are equal (no meaningful change — don't fire).
 * Returns false when the inputs differ in a way that requires a new message.
 *
 * This IS the shouldLoadSegments logic, expressed as an equality function.
 */
function loadingInputsEq(prevState: LoadingInputs, curState: LoadingInputs): boolean {
  if (!curState.segmentsCanLoad) return true;
  // Haven't started playback. Only care about preload changes.
  if (!curState.playbackInitiated) {
    if (curState.preload === 'none') return true; // blocked — equal, don't fire
    return curState.preload === prevState.preload; // equal if preload unchanged
  }
  // Transition: !playbackInitiated → playbackInitiated
  if (!prevState.playbackInitiated && curState.playbackInitiated) {
    if (prevState.preload !== 'auto') return false; // fire — message shape changes
    // preload was 'auto': fall through to segment comparison (suppress if same position)
  }

  // Don't treat as a change if we don't (yet) have a currently resolved track.
  if (!curState.track || !isResolvedTrack(curState.track)) return true;

  // If we *do* have a currently resolved track, treat as a change if the track ids have changed
  if (prevState.track?.id !== curState.track.id && isResolvedTrack(curState.track)) return false;

  // Finally, if playback has initiated *and* we have a resolved track, check if currentTime
  // has changed "significantly" (based on segment time range boundaries) and treat as a change
  // if so (regardless of whether or not the track has changed)
  return (
    segmentStartFor(prevState.currentTime, curState.track as ResolvedTrack) ===
    segmentStartFor(curState.currentTime, curState.track as ResolvedTrack)
  );
}

// ============================================================================
// REACTOR
// ============================================================================

/**
 * Load segments orchestration — Reactor layer.
 *
 * Sends typed load messages to a SegmentLoaderActor when relevant conditions
 * change. Uses targeted subscriptions rather than broad combineLatest so only
 * meaningful state changes trigger evaluation.
 *
 * Condition hierarchy (see SegmentLoadingKey for detail):
 *
 *   !playbackInitiated
 *     preload==='none' (or unset)  → dormant; no trigger
 *     preload==='metadata'         → trigger on transition to 'metadata'
 *     preload==='auto'             → trigger on transition to 'auto'
 *
 *   !playbackInitiated → playbackInitiated
 *     preload !== 'auto'           → trigger (message shape changes)
 *     preload === 'auto'           → suppressed (was already full-range mode;
 *                                    let segmentStart take over post-play)
 *                                    KNOWN LIMITATION: seek-before-play with
 *                                    preload='auto' is not supported — if the
 *                                    user seeks before pressing play, the
 *                                    first re-send is delayed until the next
 *                                    segment boundary crossing post-play.
 *
 *   playbackInitiated
 *     resolvedTrackId changes      → trigger
 *     segmentStart(currentTime) changes → trigger
 *
 * @example
 * const cleanup = loadSegments.setup({ state, context, config: { type: 'video' } });
 */
function loadSegmentsSetup({
  state,
  context,
  config,
}: {
  state: StateSignals<SegmentLoadingState>;
  context: ContextSignals<SegmentLoadingContext>;
  config: { type: MediaTrackType };
}): () => void {
  const { type } = config;
  const actorKey = ActorKeyByType[type];

  // Local throughput signal — used by createTrackedFetch to sample bandwidth
  // per chunk and propagate back to the shared state for ABR.
  const throughput = signal<BandwidthState>(
    state.bandwidthState.get() ?? {
      fastEstimate: 0,
      fastTotalWeight: 0,
      slowEstimate: 0,
      slowTotalWeight: 0,
      bytesSampled: 0,
    }
  );

  // Video tracks always sample bandwidth and bridge updates back to engine
  // state so ABR can react. Audio tracks don't track throughput.
  const fetchBytes =
    type === 'video'
      ? createTrackedFetch(throughput, (next) => {
          state.bandwidthState.set(next);
        })
      : fetchStream;

  // Local segment loader — signal so segmentsCanLoad can track it reactively
  const segmentLoader = signal<SegmentLoaderActor | undefined>(undefined);

  // Computed: isolates the specific actor key so the lifecycle effect only
  // re-runs when that actor reference changes, not on unrelated context updates.
  const actorSource = computed<SourceBufferActor | undefined>(() => context[actorKey].get());

  // Actor lifecycle — destroy and recreate SegmentLoaderActor when the
  // upstream SourceBufferActor is replaced (quality switch) or removed.
  let currentLoader: SegmentLoaderActor | undefined;
  const cleanupActorLifecycle = effect(() => {
    const actor = actorSource.get();

    if (currentLoader) {
      currentLoader.destroy();
      segmentLoader.set(undefined);
      currentLoader = undefined;
    }

    if (actor) {
      const loader = createSegmentLoaderActor(actor, fetchBytes);
      currentLoader = loader;
      segmentLoader.set(loader);
    }
  });

  // Derived: true only when we have both a resolved track and a ready loader
  const segmentsCanLoad = computed(() => {
    const stateSnapshot: SegmentLoadingState = {
      presentation: state.presentation.get(),
      selectedVideoTrackId: state.selectedVideoTrackId.get(),
      selectedAudioTrackId: state.selectedAudioTrackId.get(),
      selectedTextTrackId: state.selectedTextTrackId.get(),
    };
    const track = getSelectedTrack(stateSnapshot, type);
    return !!track && isResolvedTrack(track) && !!segmentLoader.get();
  });

  // Loading inputs — selectLoadingInputs is cheap; let the effect body apply
  // loadingInputsEq rather than the computed, so the first run always fires
  // regardless of the initial state.
  const loadingInputs = computed(() => {
    const stateSnapshot: SegmentLoadingState = {
      presentation: state.presentation.get(),
      preload: state.preload.get(),
      bandwidthState: state.bandwidthState.get(),
      currentTime: state.currentTime.get(),
      playbackInitiated: state.playbackInitiated.get(),
      selectedVideoTrackId: state.selectedVideoTrackId.get(),
      selectedAudioTrackId: state.selectedAudioTrackId.get(),
      selectedTextTrackId: state.selectedTextTrackId.get(),
    };
    return selectLoadingInputs([segmentsCanLoad.get(), stateSnapshot], type);
  });

  // Load effect — prevInputs guards against redundant messages using the same
  // equality semantics as the former combineLatest selector subscription.
  // prevInputs is updated only when we actually send a message so that the
  // transition segmentsCanLoad: false → true always fires (loadingInputsEq
  // returns true for that transition, so we must not skip it here).
  let prevInputs: LoadingInputs | undefined;
  const cleanupLoadEffect = effect(() => {
    const inputs = loadingInputs.get();
    if (prevInputs !== undefined && loadingInputsEq(prevInputs, inputs)) return;

    const { preload, playbackInitiated, currentTime, track, segmentsCanLoad: canLoad } = inputs;
    if (!canLoad) return;

    prevInputs = inputs;

    const fullMode = preload === 'auto' || !!playbackInitiated;
    if (!fullMode) {
      // Metadata mode: init only, no range.
      /** @ts-expect-error */
      segmentLoader.get()?.send({ type: 'load', track });
    } else {
      segmentLoader.get()?.send({
        type: 'load',
        /** @ts-expect-error */
        track,
        range: {
          start: currentTime as number,
          end: (currentTime as number) + DEFAULT_FORWARD_BUFFER_CONFIG.bufferDuration,
        },
      });
    }
  });

  return () => {
    cleanupActorLifecycle();
    cleanupLoadEffect();
    currentLoader?.destroy();
  };
}

export const loadSegments = defineBehavior({
  stateKeys: [
    'presentation',
    'preload',
    'bandwidthState',
    'currentTime',
    'playbackInitiated',
    'selectedVideoTrackId',
    'selectedAudioTrackId',
    'selectedTextTrackId',
  ],
  contextKeys: ['videoBuffer', 'audioBuffer', 'videoBufferActor', 'audioBufferActor'],
  setup: loadSegmentsSetup,
});
