import {
  createTextTrackSegmentLoaderActor,
  type TextTrackSegmentLoaderActor,
  type TextTrackSegmentResolver,
} from '../../behaviors/actors/text-track-segment-loader';
import type { TextTracksActor } from '../../behaviors/actors/text-tracks';
import { effect } from '../../core/signals/effect';
import { computed, type Signal, update } from '../../core/signals/primitives';
import { createTextTracksActor } from '../actors/dom/text-tracks';

/**
 * Owners shape for the text-track actor provider.
 *
 * Mirrors the shape `loadTextTrackCues` expects, but with `mediaElement`
 * typed as `HTMLMediaElement` (the concrete input the DOM factory needs)
 * and the actors parameterized over `VTTCue` (what the DOM factory produces).
 */
export interface TextTrackActorProviderOwners {
  mediaElement?: HTMLMediaElement | undefined;
  textTracksActor?: TextTracksActor<VTTCue> | undefined;
  segmentLoaderActor?: TextTrackSegmentLoaderActor | undefined;
}

/**
 * Config for the text-track actor provider.
 *
 * The cue parser is the only piece that genuinely needs the host's
 * capabilities; injecting it via config means this behavior binds only
 * `createTextTracksActor` internally (which needs the `HTMLMediaElement`
 * argument) and relies on the composition assembler to supply the parser.
 */
export interface TextTrackActorProviderConfig {
  resolveTextTrackSegment: TextTrackSegmentResolver<VTTCue>;
}

/**
 * Ensures the text-track actors are present in owners whenever a
 * media element is available.
 *
 * Creates the `TextTracksActor` (bound to the element's `textTracks`) and
 * the `TextTrackSegmentLoaderActor` (bound to the supplied cue parser)
 * on mount; the effect's cleanup destroys them on change or unmount.
 *
 * Subscribes to a `computed` projection of `mediaElement` rather than the
 * full owners signal, so writing the actor slots back to `owners` from
 * inside the effect does not re-trigger it.
 *
 * Pairs with the host-agnostic `loadTextTrackCues` behavior in
 * `behaviors/`: this provider manages actor lifecycle, the loader
 * orchestrates state transitions and dispatches load messages.
 *
 * @example
 * createComposition([provideTextTrackActors, loadTextTrackCues, ...], {
 *   config: { resolveTextTrackSegment: resolveVttSegment },
 * });
 */
export function provideTextTrackActors<O extends TextTrackActorProviderOwners>({
  owners,
  config,
}: {
  owners: Signal<O>;
  config: TextTrackActorProviderConfig;
}): () => void {
  const mediaElementSignal = computed(() => owners.get().mediaElement);

  return effect(() => {
    const mediaElement = mediaElementSignal.get();
    if (!mediaElement) return;

    const textTracksActor = createTextTracksActor(mediaElement);
    const segmentLoaderActor = createTextTrackSegmentLoaderActor(textTracksActor, config.resolveTextTrackSegment);
    update(owners, { textTracksActor, segmentLoaderActor } as Partial<O>);

    return () => {
      textTracksActor.destroy();
      segmentLoaderActor.destroy();
      update(owners, { textTracksActor: undefined, segmentLoaderActor: undefined } as Partial<O>);
    };
  });
}
