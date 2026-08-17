/**
 * **The background-video buffering cluster: owner and dispatcher.**
 *
 * The general v/a path needs four behaviors here — `setupVideoBufferActors`
 * builds a `SourceBufferActor` plus a `SegmentLoaderActor`, and
 * `loadVideoSegments` dispatches into the loader. This composition needs one
 * actor, because its buffer runs in MSE `"sequence"` mode where `buffered` is
 * complete information (see `../../actors/dom/background-video-buffer`). So the
 * pair here is the minimum the actor convention asks for: a setup behavior that
 * owns the resource and its lifetime, and a dispatcher that only reads and
 * sends.
 *
 * `sourceBuffer.mode = 'sequence'` is set here, at the one place the buffer is
 * created, rather than threaded through `createSourceBuffer` as an option — no
 * other composition wants it, and making it a shared parameter would invite one
 * to.
 *
 * Ownership: `setupBackgroundVideoBuffer` is sole writer of
 * `backgroundVideoBufferActor`; `syncBackgroundVideoBuffer` is its only reader.
 * A single-reader slot is the integration channel between the two, which is the
 * convention's intended shape rather than gratuitous publication.
 */
import { listen } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import { segmentStartForTime } from '../../../media/buffer/forward-buffer';
import { buildMimeCodec, createSourceBuffer } from '../../../media/dom/mse/mediasource-setup';
import type { MaybeResolvedPresentation, PartiallyResolvedTrack } from '../../../media/types';
import { getSelectedTrack, type TrackSelectionState } from '../../../media/utils/track-selection';
import { findResolvedVideoTrack, hasCodecs } from '../../../media/utils/tracks';
import { type FetchBytes, fetchStream } from '../../../network/fetch';
import {
  type BackgroundVideoBufferActor,
  type BackgroundVideoBufferConfig,
  type BackgroundVideoTrack,
  createBackgroundVideoBufferActor,
  createMseBufferSurface,
} from '../../actors/dom/background-video-buffer';

// ============================================================================
// STATE & CONTEXT
// ============================================================================

export interface BackgroundVideoBufferState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  /** Current playback position in seconds. Defaults to 0 when undefined. */
  currentTime?: number;
  loadActivated?: boolean;
}

export interface BackgroundVideoBufferContext {
  mediaSource?: MediaSource;
  backgroundVideoBufferActor?: BackgroundVideoBufferActor;
}

export interface SetupBackgroundVideoBufferConfig extends BackgroundVideoBufferConfig {
  /** Byte source for init and media segments. Defaults to {@link fetchStream}. */
  fetch?: FetchBytes;
}

// ============================================================================
// OWNER
// ============================================================================

type SetupFsmState = 'preconditions-unmet' | 'buffer-ready';

export const setupBackgroundVideoBuffer = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'],
  contextKeys: ['mediaSource', 'backgroundVideoBufferActor'],
  setup: ({
    state,
    context,
    config = {},
  }: {
    state: {
      presentation: ReadonlySignal<BackgroundVideoBufferState['presentation']>;
      selectedVideoTrackId: ReadonlySignal<BackgroundVideoBufferState['selectedVideoTrackId']>;
    };
    context: {
      mediaSource: ReadonlySignal<BackgroundVideoBufferContext['mediaSource']>;
      backgroundVideoBufferActor: Signal<BackgroundVideoBufferActor | undefined>;
    };
    config?: SetupBackgroundVideoBufferConfig;
  }): Reactor<SetupFsmState | 'destroying' | 'destroyed'> => {
    const { fetch = fetchStream, ...bufferConfig } = config;

    const derivedStateSignal = computed<SetupFsmState>(() => {
      if (!context.mediaSource.get()) return 'preconditions-unmet';
      const selection: TrackSelectionState = {
        presentation: state.presentation.get(),
        selectedVideoTrackId: state.selectedVideoTrackId.get(),
      };
      return hasCodecs(getSelectedTrack(selection, 'video')) ? 'buffer-ready' : 'preconditions-unmet';
    });

    return createMachineReactor<SetupFsmState>({
      initial: 'preconditions-unmet',
      monitor: () => derivedStateSignal.get(),
      states: {
        'preconditions-unmet': {},

        'buffer-ready': {
          entry: () => {
            const mediaSource = context.mediaSource.get()!;
            const selection: TrackSelectionState = {
              presentation: state.presentation.get(),
              selectedVideoTrackId: state.selectedVideoTrackId.get(),
            };
            const track = getSelectedTrack(selection, 'video') as PartiallyResolvedTrack;
            const sourceBuffer = createSourceBuffer(mediaSource, buildMimeCodec(track));

            // The whole premise. Appends now concatenate at the group end rather
            // than landing at their declared times, which is what makes
            // `buffered` a complete model and a non-zero-PTS source start at 0.
            sourceBuffer.mode = 'sequence';

            const actor = createBackgroundVideoBufferActor(createMseBufferSurface(sourceBuffer), fetch, bufferConfig);
            context.backgroundVideoBufferActor.set(actor);

            const disconnect = new AbortController();
            const teardown = () => {
              actor.destroy();
              context.backgroundVideoBufferActor.set(undefined);
              disconnect.abort();
            };

            // A UA-initiated MediaSource close has to be handled synchronously:
            // queued append continuations outrun any effect flush, and only an
            // immediate abort keeps them off a dead SourceBuffer.
            listen(mediaSource, 'sourceclose', teardown, { signal: disconnect.signal });

            return teardown;
          },
        },
      },
    });
  },
});

// ============================================================================
// DISPATCHER
// ============================================================================

type SyncFsmState = 'preconditions-unmet' | 'syncing';

export const syncBackgroundVideoBuffer = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId', 'currentTime', 'loadActivated'],
  contextKeys: ['backgroundVideoBufferActor'],
  setup: ({
    state,
    context,
  }: {
    state: {
      presentation: ReadonlySignal<BackgroundVideoBufferState['presentation']>;
      selectedVideoTrackId: ReadonlySignal<BackgroundVideoBufferState['selectedVideoTrackId']>;
      currentTime: ReadonlySignal<BackgroundVideoBufferState['currentTime']>;
      loadActivated: ReadonlySignal<BackgroundVideoBufferState['loadActivated']>;
    };
    context: {
      backgroundVideoBufferActor: ReadonlySignal<BackgroundVideoBufferContext['backgroundVideoBufferActor']>;
    };
  }): Reactor<SyncFsmState | 'destroying' | 'destroyed'> => {
    const selectedTrack = computed<BackgroundVideoTrack | undefined>(
      () =>
        findResolvedVideoTrack(state.presentation.get(), state.selectedVideoTrackId.get()) as
          | BackgroundVideoTrack
          | undefined
    );

    // Re-fire on segment-boundary crossings, which a wrap is: the value goes
    // from the last segment's start back to the first's. Within a segment it
    // holds steady and the effect dedups. Between ticks the actor self-continues
    // anyway, so this only has to catch the playhead moving somewhere new.
    const syncTrigger = computed(() => {
      const track = selectedTrack.get();
      if (!track) return undefined;
      return segmentStartForTime(state.currentTime.get() ?? 0, track.segments);
    });

    const derivedStateSignal = computed<SyncFsmState>(() => {
      if (!context.backgroundVideoBufferActor.get() || !selectedTrack.get()) return 'preconditions-unmet';
      return state.loadActivated.get() ? 'syncing' : 'preconditions-unmet';
    });

    return createMachineReactor<SyncFsmState>({
      initial: 'preconditions-unmet',
      monitor: () => derivedStateSignal.get(),
      states: {
        'preconditions-unmet': {},

        syncing: {
          effects: () => {
            const track = selectedTrack.get()!;
            syncTrigger.get();
            // Peeked: the boundary signal above already decides when to re-fire,
            // and tracking the actor's snapshot here would re-enter on every
            // step it takes.
            peek(context.backgroundVideoBufferActor)!.send({
              type: 'sync',
              track,
              currentTime: peek(state.currentTime) ?? 0,
            });
          },
        },
      },
    });
  },
});

// ============================================================================
// END OF STREAM
// ============================================================================

type EndOfStreamFsmState = 'incomplete' | 'complete';

/**
 * Call `MediaSource.endOfStream()` once the actor has appended the whole track.
 *
 * Load-bearing for looping, not a tidiness step: until the MediaSource reaches
 * `'ended'`, the element has no reason to believe more data isn't coming, so it
 * stalls at the last frame instead of firing `ended` — and `loop` never fires.
 * Measured, not assumed: dropping this behavior produced zero wraps and a 22.5s
 * stall against an otherwise working buffer.
 *
 * The general `endOfStream` can't serve here — it derives completeness from the
 * `SourceBufferActor` segment inventory this composition doesn't keep. The
 * actor's own `complete` flag answers the same question directly.
 *
 * Re-entrant by design: a restart clears `complete`, and the appends that follow
 * return the MediaSource to `'open'`, so this fires again at the end of the next
 * pass.
 */
export const endBackgroundVideoStream = defineBehavior({
  stateKeys: [],
  contextKeys: ['mediaSource', 'backgroundVideoBufferActor'],
  setup: ({
    context,
  }: {
    context: {
      mediaSource: ReadonlySignal<BackgroundVideoBufferContext['mediaSource']>;
      backgroundVideoBufferActor: ReadonlySignal<BackgroundVideoBufferContext['backgroundVideoBufferActor']>;
    };
  }): Reactor<EndOfStreamFsmState | 'destroying' | 'destroyed'> => {
    const derivedStateSignal = computed<EndOfStreamFsmState>(() => {
      const actor = context.backgroundVideoBufferActor.get();
      if (!context.mediaSource.get() || !actor) return 'incomplete';
      const snapshot = actor.snapshot.get();
      // Only from `'idle'`: mid-step the append that completes the track may not
      // have landed yet, and ending the stream early pins a short duration.
      if (snapshot.value !== 'idle' || !snapshot.context.complete) return 'incomplete';
      return 'complete';
    });

    return createMachineReactor<EndOfStreamFsmState>({
      initial: 'incomplete',
      monitor: () => derivedStateSignal.get(),
      states: {
        incomplete: {},

        complete: {
          entry: () => {
            const mediaSource = peek(context.mediaSource);
            if (mediaSource?.readyState === 'open') mediaSource.endOfStream();
          },
        },
      },
    });
  },
});
