/**
 * **Per-type buffer + segment-loader actor setup.** Per available track
 * type (video / audio), when `mediaSource` is attached and the selected
 * track of that type is present in the presentation with codecs (partial
 * resolution from the multivariant playlist is enough — codecs live on
 * the `EXT-X-STREAM-INF` line, not in the per-type media playlist),
 * creates a `SourceBuffer`, a `SourceBufferActor`, and a
 * `SegmentLoaderActor` bound to that buffer-actor; publishes the per-type
 * actor slots. On `mediaSource` detach or behavior destroy, destroys both
 * actors in reverse order and clears the per-type slots so the next
 * source starts fresh.
 *
 * Each per-type variant (`setupVideoBufferActors` /
 * `setupAudioBufferActors`) is a single-positive-state reactor
 * (`'preconditions-unmet'` ↔ `'buffer-ready'`) gating only on its own
 * type. No cross-type coupling in `stateKeys` —
 * `setupVideoBufferActors` carries only `selectedVideoTrackId` (plus
 * `bandwidthState`, written by its trackedFetch), and audio mirrors.
 *
 * # Firefox `mozHasAudio` invariant
 *
 * Appending to a video `SourceBuffer` before the audio `SourceBuffer`
 * exists causes `mozHasAudio` to be permanently false in Firefox. With
 * the two per-type variants decoupled, the invariant is no longer
 * structural to a single `entry` body (as it was when both buffers were
 * created in one synchronous block inside a merged behavior). It's now
 * preserved by a chain of assumptions about how this behavior composes
 * with its upstream and downstream siblings:
 *
 * 1. **Upstream — default selections land in one `runPending`.**
 *    `selectAudioTrack` (default audio) and `switchVideoQuality`
 *    (default video) both subscribe to `state.presentation` flipping to
 *    resolved; their effects run in the same `runPending` iteration and
 *    write `selectedAudioTrackId` + `selectedVideoTrackId` within it.
 * 2. **Self — both per-type monitors flip in one `runPending`.**
 *    After (1), both monitors re-evaluate and flip to `'buffer-ready'`
 *    in the next `runPending`. Both `entry` bodies run synchronously
 *    within that iteration — both `addSourceBuffer` calls land before
 *    the iteration ends.
 * 3. **Downstream — `appendBuffer` is async.** `loadVideoSegments` /
 *    `loadAudioSegments` read the per-type `xSegmentLoaderActor` slots;
 *    their effects fire in the *next* `runPending` and the actual
 *    `appendBuffer` requires a network round-trip via the
 *    `SegmentLoaderActor` — many microtasks past both `addSourceBuffer`
 *    calls.
 *
 * The cross-tick failure mode — a user-initiated audio track switch
 * *after* video segments have begun appending — is out of scope for
 * this behavior and would be addressed in the buffer/segment-loading
 * path via `changeType`-aware logic.
 *
 * # Sole writer
 *
 * `setupVideoBufferActors` is sole writer of `videoBufferActor` +
 * `videoSegmentLoaderActor` (and `bandwidthState` via its
 * trackedFetch); `setupAudioBufferActors` is sole writer of
 * `audioBufferActor` + `audioSegmentLoaderActor`. Both read
 * `mediaSource` from `setupMediaSource`. Downstream MSE behaviors
 * (`loadVideoSegments`, `loadAudioSegments`, `endOfStream`,
 * `updateMediaSourceDuration`) only read these slots.
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { effect } from '../../../core/signals/effect';
import { computed, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import { buildMimeCodec, createSourceBuffer } from '../../../media/dom/mse/mediasource-setup';
import type { MaybeResolvedPresentation, PartiallyResolvedTrack } from '../../../media/types';
import { isResolvedPresentation } from '../../../media/types';
import { getSelectedTrack, type TrackSelectionState } from '../../../media/utils/track-selection';
import { getTracksByType, hasCodecs } from '../../../media/utils/tracks';
import type { BandwidthState } from '../../../network/bandwidth-estimator';
import { createTrackedFetch, type FetchBytes, fetchStream } from '../../../network/fetch';
import {
  createSegmentLoaderActor,
  type SegmentLoaderActor,
  type SegmentLoaderActorConfig,
} from '../../actors/dom/segment-loader';
import { createSourceBufferActor, type SourceBufferActor } from '../../actors/dom/source-buffer';
import { AUDIO_TYPE_CONFIG, VIDEO_TYPE_CONFIG } from '../track-types';

/**
 * Media track type for MSE buffer setup.
 * Text tracks are excluded as they don't use MSE SourceBuffers.
 */
export type MediaTrackType = 'video' | 'audio';

export interface BufferActorsState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  bandwidthState?: BandwidthState;
  /**
   * Playhead position. Read by `setupAudioBufferActors`'s mid-stream flush
   * orchestration to find the next segment boundary at/after the playhead.
   * Video doesn't read this today (video ABR keeps the same buffer through
   * quality switches — no flush needed). Written by `trackCurrentTime`.
   */
  currentTime?: number;
}

export interface BufferActorsContext {
  mediaSource?: MediaSource;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
  videoSegmentLoaderActor?: SegmentLoaderActor;
  audioSegmentLoaderActor?: SegmentLoaderActor;
}

type BufferActorsFsmState = 'preconditions-unmet' | 'buffer-ready';

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId';
type BufferActorKey = 'videoBufferActor' | 'audioBufferActor';
type SegmentLoaderActorKey = 'videoSegmentLoaderActor' | 'audioSegmentLoaderActor';

type BufferActorsStateMap<K extends SelectedTrackKey> = {
  presentation: ReadonlySignal<BufferActorsState['presentation']>;
} & { [P in K]: ReadonlySignal<BufferActorsState[P]> };

type BufferActorsContextMap<A extends BufferActorKey, L extends SegmentLoaderActorKey> = {
  mediaSource: ReadonlySignal<BufferActorsContext['mediaSource']>;
} & { [P in A]: Signal<SourceBufferActor | undefined> } & {
  [P in L]: Signal<SegmentLoaderActor | undefined>;
};

// ============================================================================
// Specialization helper
//
// `setupBufferActors` has the same shape as a Behavior `setup` function:
// `({ state, context, config }) => reactor`. Each `setupXBufferActors`
// export below calls it from inside its own `defineBehavior` setup,
// passing its narrowed `state` / `context` through directly and supplying
// the per-type `selectedKey`, `actorKey`, `loaderKey`, `type` discriminator,
// and `fetch` inline.
//
// Gating is per-type only: no cross-type coupling. See the file-level
// JSDoc for how the Firefox `mozHasAudio` invariant survives the split
// via SPF's effect coalescing.
// ============================================================================

function setupBufferActors<K extends SelectedTrackKey, A extends BufferActorKey, L extends SegmentLoaderActorKey>({
  state,
  context,
  config,
}: {
  state: BufferActorsStateMap<K>;
  context: BufferActorsContextMap<A, L>;
  config: {
    type: MediaTrackType;
    selectedKey: K;
    actorKey: A;
    loaderKey: L;
    fetch: FetchBytes;
  } & SegmentLoaderActorConfig;
}): Reactor<BufferActorsFsmState | 'destroying' | 'destroyed'> {
  const { type, selectedKey, actorKey, loaderKey, fetch, forwardBuffer, backBuffer } = config;
  const derivedStateSignal = computed<BufferActorsFsmState>(() => {
    if (!context.mediaSource.get()) return 'preconditions-unmet';
    const selection: TrackSelectionState = {
      presentation: state.presentation.get(),
      [selectedKey]: state[selectedKey].get(),
    };
    return hasCodecs(getSelectedTrack(selection, type)) ? 'buffer-ready' : 'preconditions-unmet';
  });

  return createMachineReactor<BufferActorsFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'buffer-ready': {
        entry: () => {
          const mediaSource = context.mediaSource.get()!;
          const selection: TrackSelectionState = {
            presentation: state.presentation.get(),
            [selectedKey]: state[selectedKey].get(),
          };
          const track = getSelectedTrack(selection, type) as PartiallyResolvedTrack;
          const buffer = createSourceBuffer(mediaSource, buildMimeCodec(track));
          const bufferActor = createSourceBufferActor(buffer);
          const segmentLoader = createSegmentLoaderActor(bufferActor, fetch, { forwardBuffer, backBuffer });

          // Synchronous slot writes — load-bearing for the Firefox
          // `mozHasAudio` invariant (see file-level JSDoc). Both per-type
          // entries' `addSourceBuffer` calls must land in the same
          // `runPending` iteration; synchronous writes keep the contiguous
          // JS frame. Downstream `loadXSegments` effects fire in the
          // *next* `runPending`.
          context[actorKey].set(bufferActor);
          context[loaderKey].set(segmentLoader);

          // State-exit cleanup — fires when `mediaSource` detaches, the
          // selection unsets, or the behavior is destroyed. Destroy the
          // loader before its upstream buffer-actor so any in-flight
          // `appendBuffer` is aborted before the buffer-actor's own
          // teardown.
          return () => {
            segmentLoader.destroy();
            bufferActor.destroy();
            context[loaderKey].set(undefined);
            context[actorKey].set(undefined);
          };
        },
      },
    },
  });
}

// ============================================================================
// Specialized exports — one per media type
// ============================================================================

/**
 * Set up the video `SourceBufferActor` + `SegmentLoaderActor`. Fires
 * when `mediaSource` is attached and the selected video track is
 * present in the presentation with codecs. Gates only on video state —
 * no cross-type coupling. Owns a bandwidth-sampling `trackedFetch` and
 * is sole writer of `state.bandwidthState`.
 */
export const setupVideoBufferActors = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId', 'bandwidthState'] as const,
  contextKeys: ['mediaSource', 'videoBufferActor', 'videoSegmentLoaderActor'] as const,
  setup: ({
    state,
    context,
    config = {},
  }: {
    state: BufferActorsStateMap<'selectedVideoTrackId'> & {
      bandwidthState: Signal<BufferActorsState['bandwidthState']>;
    };
    context: BufferActorsContextMap<'videoBufferActor', 'videoSegmentLoaderActor'>;
    config?: object;
  }) => {
    // Bandwidth-sampling fetch. The factory accumulates EWMA state
    // internally; the callback bridges samples to engine state for ABR.
    // Created once at behavior setup time so the EWMA accumulates across
    // source resets (each per-source loader-actor receives the same
    // tracked fetch when reconstructed in `buffer-ready` entry).
    const trackedFetch = createTrackedFetch(
      state.bandwidthState.get() ?? {
        fastEstimate: 0,
        fastTotalWeight: 0,
        slowEstimate: 0,
        slowTotalWeight: 0,
        bytesSampled: 0,
      },
      (next) => state.bandwidthState.set(next)
    );
    return setupBufferActors({
      state,
      context,
      config: { ...VIDEO_TYPE_CONFIG, fetch: trackedFetch, ...config },
    });
  },
});

/**
 * Set up the audio `SourceBufferActor` + `SegmentLoaderActor`. Same shape
 * as `setupVideoBufferActors`, narrowed to audio, plus mid-stream
 * track-switch flush orchestration for multi-language-audio Tier 2.
 *
 * **Mid-stream flush.** When `selectedAudioTrackId` changes after the
 * loader has appended an init segment for a different track
 * (`bufferActor.snapshot.context.initTrackId` differs from the new
 * selection), the audio ahead-buffer is flushed from the next segment
 * boundary at/after the playhead. The current segment continues playing;
 * the new rendition picks up at the boundary. Loader replan happens
 * naturally — `loadAudioSegments` reads `selectedAudioTrackId` reactively
 * and starts fetching from the new track. Same-codec only; cross-codec
 * (5.1-surround-selection) routes through `changeType()` and is out of
 * scope here.
 *
 * The next-segment-boundary policy is a **starting point** — areas for
 * improvement: smoother A/V sync via pause-or-silence-pad, configurable
 * flush strategy, codec-change-aware routing. Tracked in the
 * multi-language-audio feature doc.
 *
 * Today this behavior supplies a non-sampling `fetchStream` (no audio
 * ABR); adding audio ABR is a localized change to this setup body (swap
 * `fetchStream` for a `createTrackedFetch` call + declare
 * `bandwidthState` writable here) without touching the shared helper.
 * See `internal/design/spf/features/audio-abr.md` for the design surface.
 */
export const setupAudioBufferActors = defineBehavior({
  stateKeys: ['presentation', 'selectedAudioTrackId', 'currentTime'] as const,
  contextKeys: ['mediaSource', 'audioBufferActor', 'audioSegmentLoaderActor'] as const,
  setup: ({
    state,
    context,
    config = {},
  }: {
    state: BufferActorsStateMap<'selectedAudioTrackId'> & {
      currentTime: ReadonlySignal<BufferActorsState['currentTime']>;
    };
    context: BufferActorsContextMap<'audioBufferActor', 'audioSegmentLoaderActor'>;
    config?: object;
  }) => {
    const reactor = setupBufferActors({
      state,
      context,
      config: { ...AUDIO_TYPE_CONFIG, fetch: fetchStream, ...config },
    });

    // Filter snapshot to just `initTrackId` so the flush effect re-fires on
    // track-id changes (loader appended init for a new track) — not on
    // every segment append. Default `equals` is identity, so string-equal
    // initTrackId values don't trigger downstream re-fires.
    const initTrackIdSignal = computed(() => context.audioBufferActor.get()?.snapshot.get().context.initTrackId);

    // Effect fires on: actor presence change, selectedAudioTrackId change,
    // initTrackId change. Bails when no actor / no selection / initTrackId
    // matches (steady state).
    const flushCleanup = effect(() => {
      const actor = context.audioBufferActor.get();
      if (!actor) return;
      const selectedId = state.selectedAudioTrackId.get();
      if (!selectedId) return;
      const initId = initTrackIdSignal.get();
      // initTrackId undefined → loader hasn't appended init yet; nothing to
      // flush. Match → steady state; nothing to flush.
      if (!initId || initId === selectedId) return;

      // Mismatch detected — mid-stream switch is in flight.
      const presentation = state.presentation.get();
      if (!presentation || !isResolvedPresentation(presentation)) return;

      const playhead = state.currentTime.get() ?? 0;

      // Compute next-segment-boundary from the OLD track's segments (the
      // ones currently buffered). The new track's playlist may not be
      // resolved yet (resolveAudioTrack is in flight); using the buffered
      // track's segment boundaries is the stable reference.
      const audioTracks = getTracksByType(presentation, 'audio');
      const oldTrack = audioTracks.find((t) => t.id === initId);
      const oldSegments = oldTrack && 'segments' in oldTrack ? (oldTrack.segments ?? []) : [];
      const nextBoundary = oldSegments.find((s) => s.startTime > playhead)?.startTime;
      // Playhead past all known segments — nothing ahead to flush.
      if (nextBoundary === undefined) return;

      actor.send({ type: 'remove', start: nextBoundary, end: Number.MAX_VALUE });
    });

    return {
      destroy: () => {
        flushCleanup();
        reactor.destroy();
      },
    };
  },
});
