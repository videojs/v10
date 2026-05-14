/**
 * **Per-type SourceBuffer + SourceBufferActor setup.** Per available track
 * type (video / audio), when `mediaSource` is attached and the selected
 * track of that type is present in the presentation with codecs (partial
 * resolution from the multivariant playlist is enough — codecs live on
 * the `EXT-X-STREAM-INF` line, not in the per-type media playlist), creates
 * a `SourceBuffer` + `SourceBufferActor` and publishes the per-type slots.
 * On `mediaSource` detach or behavior destroy, destroys the actor and
 * clears the per-type slots so the next source starts fresh.
 *
 * Each per-type variant (`setupVideoSourceBuffer` / `setupAudioSourceBuffer`)
 * is a single-positive-state reactor (`'preconditions-unmet'` ↔
 * `'buffer-ready'`) gating only on its own type. No cross-type coupling
 * in `stateKeys` — `setupVideoSourceBuffer` carries only
 * `selectedVideoTrackId`, and audio mirrors.
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
 *    `loadAudioSegments` read the per-type `xBufferActor` slots; their
 *    effects fire in the *next* `runPending` and the actual
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
 * `setupVideoSourceBuffer` is sole writer of `videoBuffer` /
 * `videoBufferActor`; `setupAudioSourceBuffer` is sole writer of
 * `audioBuffer` / `audioBufferActor`. Both read `mediaSource` from
 * `setupMediaSource`. Downstream MSE behaviors (`loadVideoSegments`,
 * `loadAudioSegments`, `endOfStream`, `updateMediaSourceDuration`) only
 * read these slots.
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import { buildMimeCodec, createSourceBuffer } from '../../../media/dom/mse/mediasource-setup';
import type { MaybeResolvedPresentation, PartiallyResolvedTrack } from '../../../media/types';
import {
  getSelectedTrack,
  SelectedTrackIdKeyByType,
  type TrackSelectionState,
} from '../../../media/utils/track-selection';
import { hasCodecs } from '../../../media/utils/tracks';
import { createSourceBufferActor, type SourceBufferActor } from '../../actors/dom/source-buffer';

/**
 * Media track type for SourceBuffer setup.
 * Text tracks are excluded as they don't use MSE SourceBuffers.
 */
export type MediaTrackType = 'video' | 'audio';

export interface SourceBufferState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

export interface SourceBufferContext {
  mediaSource?: MediaSource;
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
}

type SourceBufferFsmState = 'preconditions-unmet' | 'buffer-ready';

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId';

type SourceBufferStateMap<K extends SelectedTrackKey> = {
  presentation: ReadonlySignal<SourceBufferState['presentation']>;
} & { [P in K]: ReadonlySignal<SourceBufferState[P]> };

// ============================================================================
// Specialization helper
//
// `setupSourceBuffer` has the same shape as a Behavior `setup` function:
// `({ state, context, config }) => reactor`. Each `setupXSourceBuffer` export
// below calls it from inside its own `defineBehavior` setup, supplying its
// per-type slot signals + `type` discriminator inline.
//
// Gating is per-type only: no cross-type coupling. See the file-level JSDoc
// for how the Firefox `mozHasAudio` invariant survives the split via SPF's
// effect coalescing.
// ============================================================================

function setupSourceBuffer<K extends SelectedTrackKey>({
  state,
  context,
  config: { type },
}: {
  state: SourceBufferStateMap<K>;
  context: {
    mediaSource: ReadonlySignal<SourceBufferContext['mediaSource']>;
    buffer: Signal<SourceBuffer | undefined>;
    actor: Signal<SourceBufferActor | undefined>;
  };
  config: { type: MediaTrackType };
}): Reactor<SourceBufferFsmState | 'destroying' | 'destroyed'> {
  const selectedKey = SelectedTrackIdKeyByType[type] as K;

  const derivedStateSignal = computed<SourceBufferFsmState>(() => {
    if (!context.mediaSource.get()) return 'preconditions-unmet';
    const selection: TrackSelectionState = {
      presentation: state.presentation.get(),
      [selectedKey]: state[selectedKey].get(),
    };
    return hasCodecs(getSelectedTrack(selection, type)) ? 'buffer-ready' : 'preconditions-unmet';
  });

  return createMachineReactor<SourceBufferFsmState>({
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
          const actor = createSourceBufferActor(buffer);

          // Synchronous slot writes — load-bearing for the Firefox
          // `mozHasAudio` invariant (see file-level JSDoc). The prior
          // single-behavior impl made this structural: both
          // `addSourceBuffer` calls happened inside one `entry` body, so
          // atomicity was guaranteed by the JS call stack. The per-type
          // split moves atomicity into a contract on how this behavior
          // composes with siblings: both per-type entries must run in the
          // same `runPending` iteration as one another, which assumes the
          // engine's default-pick behaviors (selectAudio, switchVideoQuality)
          // write both `selectedXTrackId`s from one upstream
          // `state.presentation` change. Synchronous (vs. deferred) slot
          // writes keep the entry bodies in one contiguous JS frame within
          // that iteration; downstream `loadXSegments` effects fire in the
          // *next* `runPending`, and their `appendBuffer` is many
          // microtasks past the network fetch.
          context.buffer.set(buffer);
          context.actor.set(actor);

          // State-exit cleanup — fires when `mediaSource` detaches, the
          // selection unsets, or the behavior is destroyed.
          return () => {
            actor.destroy();
            context.buffer.set(undefined);
            context.actor.set(undefined);
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
 * Set up the video `SourceBuffer` + `SourceBufferActor`. Fires when
 * `mediaSource` is attached and the selected video track is present in
 * the presentation with codecs. Gates only on video state — no cross-type
 * coupling.
 */
export const setupVideoSourceBuffer = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'] as const,
  contextKeys: ['mediaSource', 'videoBuffer', 'videoBufferActor'] as const,
  setup: ({
    state,
    context,
  }: {
    state: SourceBufferStateMap<'selectedVideoTrackId'>;
    context: {
      mediaSource: ReadonlySignal<SourceBufferContext['mediaSource']>;
      videoBuffer: Signal<SourceBufferContext['videoBuffer']>;
      videoBufferActor: Signal<SourceBufferContext['videoBufferActor']>;
    };
  }) =>
    setupSourceBuffer({
      state,
      context: {
        mediaSource: context.mediaSource,
        buffer: context.videoBuffer,
        actor: context.videoBufferActor,
      },
      config: { type: 'video' },
    }),
});

/**
 * Set up the audio `SourceBuffer` + `SourceBufferActor`. Same shape as
 * `setupVideoSourceBuffer`, narrowed to audio.
 */
export const setupAudioSourceBuffer = defineBehavior({
  stateKeys: ['presentation', 'selectedAudioTrackId'] as const,
  contextKeys: ['mediaSource', 'audioBuffer', 'audioBufferActor'] as const,
  setup: ({
    state,
    context,
  }: {
    state: SourceBufferStateMap<'selectedAudioTrackId'>;
    context: {
      mediaSource: ReadonlySignal<SourceBufferContext['mediaSource']>;
      audioBuffer: Signal<SourceBufferContext['audioBuffer']>;
      audioBufferActor: Signal<SourceBufferContext['audioBufferActor']>;
    };
  }) =>
    setupSourceBuffer({
      state,
      context: {
        mediaSource: context.mediaSource,
        buffer: context.audioBuffer,
        actor: context.audioBufferActor,
      },
      config: { type: 'audio' },
    }),
});
