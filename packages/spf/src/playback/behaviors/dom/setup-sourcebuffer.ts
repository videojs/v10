/**
 * **Per-type SourceBuffer + SourceBufferActor setup.** Per available track
 * type (video / audio), when the selected track of that type is resolved
 * with codecs (and every other type present in the presentation is also
 * resolved), creates a `SourceBuffer` + `SourceBufferActor` for that type
 * and publishes the per-type slots. On `mediaSource` detach or behavior
 * destroy, destroys the actor and clears the per-type slots so the next
 * source starts fresh.
 *
 * Each per-type variant (`setupVideoSourceBuffer` / `setupAudioSourceBuffer`)
 * is a single-positive-state reactor (`'preconditions-unmet'` ↔
 * `'buffer-ready'`); both variants share the same gating predicate
 * (`mediaSource + every presentation type resolved with codecs`) so they
 * flip in the same monitor evaluation triggered by the upstream signal
 * write.
 *
 * # Atomic creation invariant (Firefox `mozHasAudio`)
 *
 * All `addSourceBuffer` calls must complete before any `appendBuffer`
 * call — appending to a video `SourceBuffer` before the audio
 * `SourceBuffer` exists causes `mozHasAudio` to be permanently false in
 * Firefox. The invariant is preserved structurally across the per-type
 * split:
 *
 * - Both per-type reactors share the same `deriveState` predicate, so
 *   they both flip to `'buffer-ready'` in the same monitor evaluation
 *   triggered by the same source-signal write.
 * - Composition registration order (`setupVideoSourceBuffer` before
 *   `setupAudioSourceBuffer` in `engine.ts`) determines `addSourceBuffer`
 *   ordering on that evaluation; both calls complete before any further
 *   microtask boundary.
 * - Downstream `appendBuffer` requires a `SegmentLoaderActor` whose
 *   `'load'` message triggers an async network fetch — many microtasks
 *   past both `addSourceBuffer` calls.
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
import type { MaybeResolvedPresentation, ResolvedTrack } from '../../../media/types';
import { isResolvedTrack } from '../../../media/types';
import { getSelectedTrack } from '../../../media/utils/track-selection';
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

function getPresentationMediaTypes(presentation: MaybeResolvedPresentation | undefined): MediaTrackType[] {
  if (!presentation?.selectionSets) return [];
  return presentation.selectionSets
    .map(({ type }) => type)
    .filter((type): type is MediaTrackType => type === 'video' || type === 'audio');
}

// ============================================================================
// Specialization helper
//
// `setupSourceBuffer` has the same shape as a Behavior `setup` function:
// `({ state, context, config }) => reactor`. Each `setupXSourceBuffer` export
// below calls it from inside its own `defineBehavior` setup, supplying its
// per-type slot signals and `type` discriminator inline.
//
// The shared gate (`mediaSource attached + every presentation type resolved
// with codecs`) lives here so both per-type variants flip state on the same
// monitor evaluation — that's what preserves the Firefox `mozHasAudio`
// invariant structurally (see file-level JSDoc).
// ============================================================================

type SourceBufferStateMap = {
  presentation: ReadonlySignal<SourceBufferState['presentation']>;
  selectedVideoTrackId: ReadonlySignal<SourceBufferState['selectedVideoTrackId']>;
  selectedAudioTrackId: ReadonlySignal<SourceBufferState['selectedAudioTrackId']>;
};

type SourceBufferContextSlice = {
  mediaSource: ReadonlySignal<SourceBufferContext['mediaSource']>;
  buffer: Signal<SourceBuffer | undefined>;
  actor: Signal<SourceBufferActor | undefined>;
};

function deriveStateFor(
  type: MediaTrackType,
  presentation: MaybeResolvedPresentation | undefined,
  mediaSource: MediaSource | undefined,
  selectedVideoTrackId: string | undefined,
  selectedAudioTrackId: string | undefined
): SourceBufferFsmState {
  if (!mediaSource) return 'preconditions-unmet';
  const types = getPresentationMediaTypes(presentation);
  if (!types.includes(type)) return 'preconditions-unmet';
  const s: SourceBufferState = { presentation, selectedVideoTrackId, selectedAudioTrackId };
  const allResolved = types.every((t) => {
    const track = getSelectedTrack(s, t);
    return track && isResolvedTrack(track) && !!track.codecs?.length;
  });
  return allResolved ? 'buffer-ready' : 'preconditions-unmet';
}

function setupSourceBuffer({
  state,
  context,
  config: { type },
}: {
  state: SourceBufferStateMap;
  context: SourceBufferContextSlice;
  config: { type: MediaTrackType };
}): Reactor<SourceBufferFsmState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() =>
    deriveStateFor(
      type,
      state.presentation.get(),
      context.mediaSource.get(),
      state.selectedVideoTrackId.get(),
      state.selectedAudioTrackId.get()
    )
  );

  return createMachineReactor<SourceBufferFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'buffer-ready': {
        // Both per-type variants flip into `'buffer-ready'` on the same
        // monitor evaluation (shared gate); registration order in the
        // engine composition determines `addSourceBuffer` ordering on
        // that evaluation. State-exit cleanup destroys the actor and
        // clears the per-type slots — fires when mediaSource detaches,
        // the presentation drops resolution, or the behavior is destroyed.
        entry: () => {
          const mediaSource = context.mediaSource.get()!;
          const s: SourceBufferState = {
            presentation: state.presentation.get(),
            selectedVideoTrackId: state.selectedVideoTrackId.get(),
            selectedAudioTrackId: state.selectedAudioTrackId.get(),
          };
          const track = getSelectedTrack(s, type) as ResolvedTrack;
          const buffer = createSourceBuffer(mediaSource, buildMimeCodec(track));
          const actor = createSourceBufferActor(buffer);
          context.buffer.set(buffer);
          context.actor.set(actor);

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

const SOURCE_BUFFER_STATE_KEYS = ['presentation', 'selectedVideoTrackId', 'selectedAudioTrackId'] as const;

/**
 * Set up the video `SourceBuffer` + `SourceBufferActor`. Fires when
 * `mediaSource` is attached, the presentation has a video selection set,
 * and every type in the presentation has a resolved track with codecs
 * (shared gate — see file-level JSDoc on the `mozHasAudio` invariant).
 */
export const setupVideoSourceBuffer = defineBehavior({
  stateKeys: SOURCE_BUFFER_STATE_KEYS,
  contextKeys: ['mediaSource', 'videoBuffer', 'videoBufferActor'] as const,
  setup: ({
    state,
    context,
  }: {
    state: SourceBufferStateMap;
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
  stateKeys: SOURCE_BUFFER_STATE_KEYS,
  contextKeys: ['mediaSource', 'audioBuffer', 'audioBufferActor'] as const,
  setup: ({
    state,
    context,
  }: {
    state: SourceBufferStateMap;
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
