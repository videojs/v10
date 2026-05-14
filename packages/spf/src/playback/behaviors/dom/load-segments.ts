/**
 * **Per-type segment loading orchestration.** Per available track type
 * (video / audio), own a `SegmentLoaderActor` bound to the type's
 * `SourceBufferActor` and send typed `'load'` messages whenever a
 * meaningful loading condition changes (selected track, current time
 * crossing a segment boundary, preload, load activation).
 *
 * Per-type variants supply their own fetch function — `loadVideoSegments`
 * supplies a bandwidth-sampling tracked fetch and writes samples to
 * `state.bandwidthState` for ABR; `loadAudioSegments` currently supplies
 * a non-sampling fetch (placeholder until audio ABR lands, including
 * audio-only ABR). The shared `setupSegmentLoading` helper is
 * fetch-neutral by design — no `type === 'video'` branch — so adding
 * audio ABR is a localized change to `loadAudioSegments`'s setup body,
 * not a helper-shape change.
 *
 * # Loader lifecycle
 *
 * Modeled as a `createMachineReactor` with `'no-loader'` ↔ `'has-loader'`
 * states gated on upstream `xBufferActor` presence. Within `'has-loader'`:
 *
 * - The loader-lifecycle effect tracks the actor reference; its cleanup
 *   destroys the loader on state exit AND on within-state actor identity
 *   change (per the effects-based cleanup idiom in `reactors.md`).
 * - The dispatcher effect tracks the loader signal and the loading
 *   inputs; loader replacement triggers a fresh dispatch, with
 *   `prevInputs` dedup reset bound to loader (re)creation.
 *
 * Sole writer of `state.bandwidthState` (variant-scoped: only
 * `loadVideoSegments`). Reads `xBufferActor` from `setupXSourceBuffer`.
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal, signal } from '../../../core/signals/primitives';
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

// ============================================================================
// FETCH FUNCTIONS (variant-supplied)
// ============================================================================

type FetchOptions = RequestInit & ChunkedStreamIterableOptions;
export type FetchBytes = (addressable: AddressableObject, options?: FetchOptions) => Promise<AsyncIterable<Uint8Array>>;

/**
 * Bandwidth-sampling fetch: eagerly starts the request, then returns a lazy
 * iterable over the response body that samples bandwidth per chunk and
 * propagates samples outward via `onSample`. Used by `loadVideoSegments`
 * for ABR; future audio-ABR will use the same shape.
 *
 * Separating connection start from body reading ensures `fetch()` is called
 * as soon as the task begins — not deferred until the actor's append loop
 * first pulls a chunk. This makes fetch timing predictable and observable
 * (e.g. in tests that record fetched URLs) regardless of downstream consumers.
 */
export function createTrackedFetch(
  throughput: Signal<BandwidthState>,
  onSample: (next: BandwidthState) => void
): FetchBytes {
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
          onSample(next);
          yield chunk;
          chunkStart = performance.now();
        }
      },
    };
  };
}

/**
 * Non-sampling fetch: eagerly starts the request and returns the response
 * body as a lazy chunk iterable. Used by `loadAudioSegments` today; audio
 * ABR would swap this for a `createTrackedFetch` call. Pure helper —
 * candidate to move to `network/` in a follow-up.
 */
export async function fetchStream(
  addressable: AddressableObject,
  options?: FetchOptions
): Promise<AsyncIterable<Uint8Array>> {
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
  /** True once a preload-overriding event has fired for the current source. Allows full segment loading regardless of preload setting. */
  loadActivated?: boolean;
}

/**
 * Context shape for segment loading. Each per-type variant only consumes
 * its own type's buffer actor; the helper is parameterized over one
 * `bufferActor` slot.
 */
export interface SegmentLoadingContext {
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
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

const segmentStartFor = (currentTime: number | undefined, track: ResolvedTrack | undefined) => {
  if (currentTime == null) return undefined;
  return track?.segments.find(
    ({ startTime, duration }, i, segments) =>
      currentTime >= startTime && (currentTime < startTime + duration || i === segments.length - 1)
  )?.startTime;
};

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
    segmentStartFor(prevState.currentTime, curState.track as ResolvedTrack) ===
    segmentStartFor(curState.currentTime, curState.track as ResolvedTrack)
  );
}

// ============================================================================
// REACTOR
// ============================================================================

type SegmentLoadingFsmState = 'no-loader' | 'has-loader';

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId';
type BufferActorKey = 'videoBufferActor' | 'audioBufferActor';

type SegmentLoadingStateMap<K extends SelectedTrackKey> = {
  presentation: ReadonlySignal<SegmentLoadingState['presentation']>;
  preload: ReadonlySignal<SegmentLoadingState['preload']>;
  currentTime: ReadonlySignal<SegmentLoadingState['currentTime']>;
  loadActivated: ReadonlySignal<SegmentLoadingState['loadActivated']>;
} & { [P in K]: ReadonlySignal<SegmentLoadingState[P]> };

type SegmentLoadingContextMap<A extends BufferActorKey> = {
  [P in A]: ReadonlySignal<SourceBufferActor | undefined>;
};

/**
 * Specialization helper. Per-type variants (`loadVideoSegments` /
 * `loadAudioSegments`) call this from inside their own `defineBehavior`
 * setup, passing their narrowed `state` / `context` through directly and
 * supplying the per-type `selectedKey`, `actorKey`, `type`, and `fetch`
 * function inline. The helper is fetch-neutral by design — variant-
 * specific concerns (bandwidth sampling, future audio ABR) live in the
 * variant's setup body.
 */
function setupSegmentLoading<K extends SelectedTrackKey, A extends BufferActorKey>({
  state,
  context,
  config: { type, selectedKey, actorKey, fetch },
}: {
  state: SegmentLoadingStateMap<K>;
  context: SegmentLoadingContextMap<A>;
  config: {
    type: MediaTrackType;
    selectedKey: K;
    actorKey: A;
    fetch: FetchBytes;
  };
}): Reactor<SegmentLoadingFsmState | 'destroying' | 'destroyed'> {
  // Loader signal — the dispatcher reads it tracked so loader replacement
  // (within-state actor identity change) triggers a fresh dispatch.
  const segmentLoader = signal<SegmentLoaderActor | undefined>(undefined);

  // Dedup state across dispatcher re-fires. Reset by the loader-lifecycle
  // effect's body on (re)creation, so within-state actor swaps and
  // state-exit/-entry both refresh dedup structurally.
  let prevInputs: LoadingInputs | undefined;

  const segmentsCanLoad = computed(() => {
    const selection: TrackSelectionState = {
      presentation: state.presentation.get(),
      [selectedKey]: state[selectedKey].get(),
    };
    const track = getSelectedTrack(selection, type);
    return !!track && isResolvedTrack(track) && !!segmentLoader.get();
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
    context[actorKey].get() ? 'has-loader' : 'no-loader'
  );

  return createMachineReactor<SegmentLoadingFsmState>({
    initial: 'no-loader',
    monitor: () => derivedStateSignal.get(),
    states: {
      'no-loader': {},

      'has-loader': {
        effects: [
          // Loader lifecycle — effects (not entry) so the cleanup fires on
          // both state exit AND within-state actor identity change (per
          // `reactors.md` → "Effects-based cleanup for within-state identity
          // changes"). The tracked read on the actor slot makes the body
          // re-fire on actor replacement; cleanup destroys the old loader
          // before the body creates the new one.
          () => {
            const actor = context[actorKey].get();
            if (!actor) return;
            const loader = createSegmentLoaderActor(actor, fetch);
            segmentLoader.set(loader);
            // Bind dedup reset to loader (re)creation. State-exit and
            // within-state actor swap both re-run this body, so
            // `prevInputs` refresh is structural — no parallel reset path.
            prevInputs = undefined;
            return () => {
              loader.destroy();
              segmentLoader.set(undefined);
            };
          },

          // Dispatcher — tracks both `segmentLoader` (so loader replacement
          // triggers a fresh dispatch with reset `prevInputs` already in
          // hand) and `loadingInputs`.
          () => {
            const loader = segmentLoader.get();
            if (!loader) return;
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
        ],
      },
    },
  });
}

// ============================================================================
// Specialized exports — one per media type
// ============================================================================

/**
 * Load video segments — drives the video `SourceBufferActor` with media
 * segments based on preload / loadActivated / currentTime / selected
 * track. Samples bandwidth per chunk and bridges samples to
 * `state.bandwidthState` for ABR.
 */
export const loadVideoSegments = defineBehavior({
  stateKeys: ['presentation', 'preload', 'bandwidthState', 'currentTime', 'loadActivated', 'selectedVideoTrackId'],
  contextKeys: ['videoBufferActor'],
  setup: ({
    state,
    context,
  }: {
    state: SegmentLoadingStateMap<'selectedVideoTrackId'> & {
      bandwidthState: Signal<SegmentLoadingState['bandwidthState']>;
    };
    context: {
      videoBufferActor: ReadonlySignal<SegmentLoadingContext['videoBufferActor']>;
    };
  }) => {
    // Variant-scoped throughput signal + tracked fetch. The bridge
    // callback writes samples back into engine state for ABR.
    const throughput = signal<BandwidthState>(
      state.bandwidthState.get() ?? {
        fastEstimate: 0,
        fastTotalWeight: 0,
        slowEstimate: 0,
        slowTotalWeight: 0,
        bytesSampled: 0,
      }
    );
    const trackedFetch = createTrackedFetch(throughput, (next) => state.bandwidthState.set(next));

    return setupSegmentLoading({
      state,
      context,
      config: {
        type: 'video',
        selectedKey: 'selectedVideoTrackId',
        actorKey: 'videoBufferActor',
        fetch: trackedFetch,
      },
    });
  },
});

/**
 * Load audio segments — same orchestration shape as `loadVideoSegments`,
 * narrowed to audio. Today supplies a non-sampling fetch (no audio ABR);
 * adding audio ABR is a localized change to this setup body (swap
 * `fetchStream` for a `createTrackedFetch` call + declare
 * `bandwidthState` writable here) without touching the shared helper.
 */
export const loadAudioSegments = defineBehavior({
  stateKeys: ['presentation', 'preload', 'currentTime', 'loadActivated', 'selectedAudioTrackId'],
  contextKeys: ['audioBufferActor'],
  setup: ({
    state,
    context,
  }: {
    state: SegmentLoadingStateMap<'selectedAudioTrackId'>;
    context: {
      audioBufferActor: ReadonlySignal<SegmentLoadingContext['audioBufferActor']>;
    };
  }) =>
    setupSegmentLoading({
      state,
      context,
      config: {
        type: 'audio',
        selectedKey: 'selectedAudioTrackId',
        actorKey: 'audioBufferActor',
        fetch: fetchStream,
      },
    }),
});
