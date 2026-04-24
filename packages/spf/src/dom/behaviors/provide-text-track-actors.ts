import { effect } from '../../core/signals/effect';
import { type Signal, untrack, update } from '../../core/signals/primitives';
import {
  type CueParser,
  createTextTrackSegmentLoaderActor,
  type TextTrackSegmentLoaderActor,
} from '../../media/actors/text-track-segment-loader';
import type { TextTracksActor } from '../../media/actors/text-tracks';
import { createTextTracksActor } from '../actors/text-tracks';

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
  parseSegment: CueParser<VTTCue>;
}

/**
 * Ensures the text-track actors are present in owners whenever a
 * media element is available.
 *
 * Creates the `TextTracksActor` (bound to the element's `textTracks`) and
 * the `TextTrackSegmentLoaderActor` (bound to the supplied cue parser)
 * on mount, destroys them on change or unmount. Writes both to `owners`.
 *
 * Pairs with the host-agnostic `loadTextTrackCues` behavior in
 * `media/behaviors/`: this provider manages actor lifecycle, the loader
 * orchestrates state transitions and dispatches load messages.
 *
 * @example
 * createComposition([provideTextTrackActors, loadTextTrackCues, ...], {
 *   config: { parseSegment: parseVttSegment },
 * });
 */
export function provideTextTrackActors<O extends TextTrackActorProviderOwners>({
  owners,
  config,
}: {
  owners: Signal<O>;
  config: TextTrackActorProviderConfig;
}): () => void {
  let lastMediaElement: HTMLMediaElement | undefined;

  const teardown = (): void => {
    const { textTracksActor, segmentLoaderActor } = untrack(() => owners.get());
    if (!textTracksActor && !segmentLoaderActor) return;
    textTracksActor?.destroy();
    segmentLoaderActor?.destroy();
    update(owners, { textTracksActor: undefined, segmentLoaderActor: undefined } as Partial<O>);
  };

  const cleanupEffect = effect(() => {
    const { mediaElement } = owners.get();
    if (mediaElement === lastMediaElement) return;

    teardown();
    lastMediaElement = mediaElement;
    if (!mediaElement) return;

    const textTracksActor = createTextTracksActor(mediaElement);
    const segmentLoaderActor = createTextTrackSegmentLoaderActor(textTracksActor, config.parseSegment);
    update(owners, { textTracksActor, segmentLoaderActor } as Partial<O>);
  });

  return () => {
    cleanupEffect();
    teardown();
  };
}
