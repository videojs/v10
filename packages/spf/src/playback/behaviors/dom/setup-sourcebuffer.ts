/**
 * **Atomically create all needed `SourceBuffer`s for the current source.**
 * Once a `MediaSource` is attached and every video/audio selection set in
 * the presentation has a selected, resolved track with non-empty codecs,
 * creates each `SourceBuffer` + its `SourceBufferActor` in one synchronous
 * block and publishes the per-type slots. On `MediaSource` detach or
 * behavior destroy, destroys all actors and clears the slots so the next
 * source starts fresh.
 *
 * Single-positive-state reactor (`'preconditions-unmet'` ↔
 * `'all-buffers-ready'`) gated on `mediaSource + presentation + selected
 * track ids`. Riding the MediaSource lifecycle makes source-reset
 * structural — when `setupMediaSource`'s state-exit clears `mediaSource`,
 * `deriveState` flips back to `'preconditions-unmet'` and the entry's
 * state-exit cleanup destroys actors and clears all four buffer/actor
 * slots before the next source attaches.
 *
 * # Atomic creation
 *
 * All needed buffers are added in one synchronous block (no `await`
 * between `addSourceBuffer` calls) before any slot is published. This
 * prevents a Firefox bug where appending to a video `SourceBuffer` before
 * the audio `SourceBuffer` exists causes `mozHasAudio` to be permanently
 * false — downstream `loadSegments` never sees a half-configured set.
 *
 * # Sole writer
 *
 * Sole writer of `videoBuffer` / `audioBuffer` / `videoBufferActor` /
 * `audioBufferActor`. Reads `mediaSource` from `setupMediaSource`. Other
 * MSE behaviors (`loadSegments`, `endOfStream`, `updateMediaSourceDuration`)
 * only read these slots.
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import { buildMimeCodec, createSourceBuffer } from '../../../media/dom/mse/mediasource-setup';
import type { MaybeResolvedPresentation, ResolvedTrack } from '../../../media/types';
import { isResolvedTrack } from '../../../media/types';
import { BufferKeyByType, getSelectedTrack } from '../../../media/utils/track-selection';
import { createSourceBufferActor, type SourceBufferActor } from '../../actors/dom/source-buffer';

/**
 * Media track type for SourceBuffer setup.
 * Text tracks are excluded as they don't use MSE SourceBuffers.
 */
export type MediaTrackType = 'video' | 'audio';

const ActorKeyByType = {
  video: 'videoBufferActor',
  audio: 'audioBufferActor',
} as const satisfies Record<MediaTrackType, keyof SourceBufferContext>;

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

type SourceBufferFsmState = 'preconditions-unmet' | 'all-buffers-ready';

function getPresentationMediaTypes(presentation: MaybeResolvedPresentation | undefined): MediaTrackType[] {
  if (!presentation?.selectionSets) return [];
  return presentation.selectionSets
    .map(({ type }) => type)
    .filter((type): type is MediaTrackType => type === 'video' || type === 'audio');
}

function deriveState(
  presentation: MaybeResolvedPresentation | undefined,
  mediaSource: MediaSource | undefined,
  selectedVideoTrackId: string | undefined,
  selectedAudioTrackId: string | undefined
): SourceBufferFsmState {
  if (!mediaSource) return 'preconditions-unmet';
  const types = getPresentationMediaTypes(presentation);
  if (types.length === 0) return 'preconditions-unmet';
  const s: SourceBufferState = { presentation, selectedVideoTrackId, selectedAudioTrackId };
  const allResolved = types.every((type) => {
    const track = getSelectedTrack(s, type);
    return track && isResolvedTrack(track) && !!track.codecs?.length;
  });
  return allResolved ? 'all-buffers-ready' : 'preconditions-unmet';
}

function setupSourceBuffersSetup({
  state,
  context,
}: {
  state: {
    presentation: ReadonlySignal<SourceBufferState['presentation']>;
    selectedVideoTrackId: ReadonlySignal<SourceBufferState['selectedVideoTrackId']>;
    selectedAudioTrackId: ReadonlySignal<SourceBufferState['selectedAudioTrackId']>;
  };
  context: {
    mediaSource: ReadonlySignal<SourceBufferContext['mediaSource']>;
    videoBuffer: Signal<SourceBufferContext['videoBuffer']>;
    audioBuffer: Signal<SourceBufferContext['audioBuffer']>;
    videoBufferActor: Signal<SourceBufferContext['videoBufferActor']>;
    audioBufferActor: Signal<SourceBufferContext['audioBufferActor']>;
  };
}): Reactor<SourceBufferFsmState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() =>
    deriveState(
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

      'all-buffers-ready': {
        // entry body is auto-untracked. deriveState handles source resets via
        // setupMediaSource's mediaSource clear; this entry creates every
        // needed SourceBuffer + actor in one synchronous block (per the
        // Firefox mozHasAudio bug — see module docs) and binds destroy +
        // slot clear to state exit + destroy.
        entry: () => {
          const mediaSource = context.mediaSource.get()!;
          const presentation = state.presentation.get();
          const types = getPresentationMediaTypes(presentation);
          const s: SourceBufferState = {
            presentation,
            selectedVideoTrackId: state.selectedVideoTrackId.get(),
            selectedAudioTrackId: state.selectedAudioTrackId.get(),
          };

          // Create all SourceBuffers synchronously — no await between
          // addSourceBuffer calls — then publish on context.
          const created: Array<{ type: MediaTrackType; actor: SourceBufferActor }> = [];
          for (const type of types) {
            const track = getSelectedTrack(s, type) as ResolvedTrack;
            const buffer = createSourceBuffer(mediaSource, buildMimeCodec(track));
            const actor = createSourceBufferActor(buffer);
            context[BufferKeyByType[type]].set(buffer);
            context[ActorKeyByType[type]].set(actor);
            created.push({ type, actor });
          }

          return () => {
            for (const { type, actor } of created) {
              actor.destroy();
              context[BufferKeyByType[type]].set(undefined);
              context[ActorKeyByType[type]].set(undefined);
            }
          };
        },
      },
    },
  });
}

export const setupSourceBuffers = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId', 'selectedAudioTrackId'],
  contextKeys: ['mediaSource', 'videoBuffer', 'audioBuffer', 'videoBufferActor', 'audioBufferActor'],
  setup: setupSourceBuffersSetup,
});
