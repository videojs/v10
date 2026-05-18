import { defineBehavior } from '../../core/composition/create-composition';
import type { Reactor } from '../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal } from '../../core/signals/primitives';
import { DEFAULT_FORWARD_BUFFER_CONFIG, segmentStartForTime } from '../../media/buffer/forward-buffer';
import type { MaybeResolvedPresentation } from '../../media/types';
import { findResolvedTextTrack } from '../../media/utils/tracks';
import type { TextTrackSegmentLoaderActor } from '../actors/text-track-segment-loader';

/**
 * Drive the text-track segment loader: as `currentTime` crosses segment
 * boundaries and the selected text track changes, dispatch `load`
 * messages so the loader can fetch and parse VTT segments inside its
 * forward-buffer window.
 *
 * # Load modes as reactor states
 *
 * Three states encode the load-gating policy directly, replacing
 * imperative `preload` / `loadActivated` checks inside an effect:
 *
 * - `'preconditions-unmet'` — no loader actor in context, or the
 *   selected text track hasn't resolved to a track with segments.
 * - `'dormant'` — preconditions met but the load policy is "don't load
 *   anything yet": `!loadActivated && preload !== 'auto'`. Covers both
 *   `preload === 'none'` and `preload === 'metadata'`. (For audio /
 *   video, `preload === 'metadata'` triggers an init-segment-only mode;
 *   text/VTT has no init-segment concept — the manifest already exposes
 *   per-cue duration / language — so the metadata case collapses into
 *   dormant.)
 * - `'full-range'` — `loadActivated || preload === 'auto'`. Effect
 *   re-fires on selected-track change and on segment-boundary crossing
 *   (a `computed` over `segmentStartForTime(currentTime, segments)`
 *   dedups within-segment `currentTime` ticks via signal-polyfill's
 *   default `Object.is` equality).
 *
 * Companion to `setupTextTrackActors` (which owns actor lifecycle) and
 * `syncTextTracks` (which mounts `<track>` elements). Composition order
 * ensures mounting happens before this reactor evaluates; the
 * `TextTracksActor` silently no-ops if a `load`'s cues arrive for a
 * not-yet-mounted track, so we don't gate on DOM mount here.
 *
 * Source-reset / in-flight cancellation is the loader's responsibility,
 * not this behavior's: the next `load` aborts in-flight work, and the
 * loader's destroy (driven by `setupTextTrackActors`) tears down the
 * runner.
 *
 * @example
 * const reactor = loadTextTrackSegments.setup({ state, context });
 */
export interface TextTrackSegmentLoadingState {
  selectedTextTrackId?: string;
  presentation?: MaybeResolvedPresentation;
  /** Current playback position — used to gate segment fetching to the forward buffer window. */
  currentTime?: number;
  preload?: string;
  /** True once a preload-overriding event has fired for the current source. Allows full segment loading regardless of preload setting. */
  loadActivated?: boolean;
}

export interface TextTrackSegmentLoadingContext {
  textTrackSegmentLoaderActor?: TextTrackSegmentLoaderActor | undefined;
}

type LoadTextTrackSegmentsState = 'preconditions-unmet' | 'dormant' | 'full-range';

function loadTextTrackSegmentsSetup({
  state,
  context,
}: {
  state: {
    selectedTextTrackId: ReadonlySignal<TextTrackSegmentLoadingState['selectedTextTrackId']>;
    presentation: ReadonlySignal<TextTrackSegmentLoadingState['presentation']>;
    currentTime: ReadonlySignal<TextTrackSegmentLoadingState['currentTime']>;
    preload: ReadonlySignal<TextTrackSegmentLoadingState['preload']>;
    loadActivated: ReadonlySignal<TextTrackSegmentLoadingState['loadActivated']>;
  };
  context: {
    textTrackSegmentLoaderActor: ReadonlySignal<TextTrackSegmentLoadingContext['textTrackSegmentLoaderActor']>;
  };
}): Reactor<LoadTextTrackSegmentsState | 'destroying' | 'destroyed'> {
  const selectedTrackSignal = computed(() => {
    const track = findResolvedTextTrack(state.presentation.get(), state.selectedTextTrackId.get());
    return track && track.segments.length > 0 ? track : undefined;
  });

  // Segment-boundary signal — `segmentStartForTime` returns the same
  // number while `currentTime` stays inside one segment, so signal-
  // polyfill's `Object.is` equality on this computed dedups within-
  // segment ticks. The `'full-range'` effect tracks this signal (rather
  // than `currentTime` directly) so it only re-fires on boundary crossings.
  const segmentBoundarySignal = computed(() => {
    const track = selectedTrackSignal.get();
    if (!track) return undefined;
    return segmentStartForTime(state.currentTime.get() ?? 0, track.segments);
  });

  const derivedStateSignal = computed<LoadTextTrackSegmentsState>(() => {
    if (!context.textTrackSegmentLoaderActor.get() || !selectedTrackSignal.get()) {
      return 'preconditions-unmet';
    }
    return state.loadActivated.get() || state.preload.get() === 'auto' ? 'full-range' : 'dormant';
  });

  return createMachineReactor<LoadTextTrackSegmentsState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},
      dormant: {},
      'full-range': {
        // Re-fires on selected-track changes (`selectedTrackSignal`) and
        // on segment-boundary crossing (`segmentBoundarySignal`). The
        // loader actor reference is peeked — its presence is a state
        // invariant. `currentTime` is peeked too: we don't want a tracked
        // read here, the boundary-dedup signal already handles re-firing
        // policy; we just want the live value at dispatch time so the
        // loader's forward-buffer window anchors correctly.
        effects: () => {
          const track = selectedTrackSignal.get()!;
          // Tracked: re-fires the effect on boundary crossings.
          segmentBoundarySignal.get();
          const currentTime = peek(state.currentTime) ?? 0;
          peek(context.textTrackSegmentLoaderActor)!.send({
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

export const loadTextTrackSegments = defineBehavior({
  stateKeys: ['selectedTextTrackId', 'presentation', 'currentTime', 'preload', 'loadActivated'],
  contextKeys: ['textTrackSegmentLoaderActor'],
  setup: loadTextTrackSegmentsSetup,
});
