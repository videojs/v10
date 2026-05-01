import type { ContextSignals } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import { computed } from '../../../core/signals/primitives';
import { createTextTracksActor } from '../../actors/dom/text-tracks';
import {
  createTextTrackSegmentLoaderActor,
  type TextTrackSegmentLoaderActor,
  type TextTrackSegmentResolver,
} from '../../actors/text-track-segment-loader';
import type { TextTracksActor } from '../../actors/text-tracks';

/**
 * Context shape for text-track actors setup.
 *
 * Mirrors the shape `loadTextTrackCues` expects, but with `mediaElement`
 * typed as `HTMLMediaElement` (the concrete input the DOM factory needs)
 * and the actors parameterized over `VTTCue` (what the DOM factory produces).
 */
export interface TextTrackActorsContext {
  mediaElement?: HTMLMediaElement | undefined;
  textTracksActor?: TextTracksActor<VTTCue> | undefined;
  segmentLoaderActor?: TextTrackSegmentLoaderActor | undefined;
}

/**
 * Config for text-track actors setup.
 *
 * The cue parser is the only piece that genuinely needs the host's
 * capabilities; injecting it via config means this behavior binds only
 * `createTextTracksActor` internally (which needs the `HTMLMediaElement`
 * argument) and relies on the composition assembler to supply the parser.
 */
export interface TextTrackActorsConfig {
  resolveTextTrackSegment: TextTrackSegmentResolver<VTTCue>;
}

/**
 * Setup text-track actors orchestration.
 *
 * Creates the `TextTracksActor` (bound to the element's `textTracks`) and
 * the `TextTrackSegmentLoaderActor` (bound to the supplied cue parser)
 * whenever a media element is available; the effect's cleanup destroys them
 * on change or unmount.
 *
 * Subscribes to a `computed` projection of `mediaElement` rather than the
 * full context signal, so writing the actor slots back to `context` from
 * inside the effect does not re-trigger it.
 *
 * Pairs with the host-agnostic `loadTextTrackCues` behavior in
 * `behaviors/`: this setup manages actor lifecycle, the loader
 * orchestrates state transitions and dispatches load messages.
 *
 * @example
 * createComposition([setupTextTrackActors, loadTextTrackCues, ...], {
 *   config: { resolveTextTrackSegment: resolveVttSegment },
 * });
 */
export function setupTextTrackActors({
  context,
  config,
}: {
  context: ContextSignals<TextTrackActorsContext>;
  config: TextTrackActorsConfig;
}): () => void {
  const mediaElementSignal = computed(() => context.mediaElement.get());

  return effect(() => {
    const mediaElement = mediaElementSignal.get();
    if (!mediaElement) return;

    const textTracksActor = createTextTracksActor(mediaElement);
    const segmentLoaderActor = createTextTrackSegmentLoaderActor(textTracksActor, config.resolveTextTrackSegment);
    context.textTracksActor.set(textTracksActor);
    context.segmentLoaderActor.set(segmentLoaderActor);

    return () => {
      textTracksActor.destroy();
      segmentLoaderActor.destroy();
      context.textTracksActor.set(undefined);
      context.segmentLoaderActor.set(undefined);
    };
  });
}
