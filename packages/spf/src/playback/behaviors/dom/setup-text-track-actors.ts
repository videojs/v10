/**
 * **Own the TextTracks actor pair for the current `mediaElement`.** When a
 * `mediaElement` is in scope, creates the `TextTracksActor` (bound to the
 * element's `textTracks`) and the `TextTrackSegmentLoaderActor` (bound to
 * that actor + the injected cue resolver), and publishes both on
 * `context`. On element identity change or behavior destroy, destroys both
 * actors and clears the slots.
 *
 * Single-resource synchronous create/destroy driven by one signal — the
 * simple-effect form is the right shape (per `behaviors.md` → "Where both
 * shapes are legitimate": criterion 4b applies; sole writer of
 * `textTracksActor` / `textTrackSegmentLoaderActor`, the effect's cleanup
 * return handles destroy + slot clear structurally).
 *
 * Pairs with the `loadTextTrackSegments` behavior (a per-type variant of
 * `setupSegmentLoading` in `load-segments.ts`), which only reads
 * `textTrackSegmentLoaderActor`. The cue resolver is injected via
 * `config` so this behavior owns the DOM-bound part of the text-track
 * pipeline.
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import type { ReadonlySignal, Signal } from '../../../core/signals/primitives';
import { createTextTracksActor } from '../../actors/dom/text-tracks';
import {
  createTextTrackSegmentLoaderActor,
  type TextTrackSegmentLoaderActor,
  type TextTrackSegmentLoaderActorConfig,
  type TextTrackSegmentResolver,
} from '../../actors/text-track-segment-loader';
import type { TextTracksActor } from '../../actors/text-tracks';

export interface TextTrackActorsContext {
  mediaElement?: HTMLMediaElement | undefined;
  textTracksActor?: TextTracksActor<VTTCue> | undefined;
  textTrackSegmentLoaderActor?: TextTrackSegmentLoaderActor | undefined;
}

export interface TextTrackActorsConfig extends TextTrackSegmentLoaderActorConfig {
  resolveTextTrackSegment: TextTrackSegmentResolver<VTTCue>;
}

function setupTextTrackActorsSetup({
  context,
  config,
}: {
  context: {
    mediaElement: ReadonlySignal<TextTrackActorsContext['mediaElement']>;
    textTracksActor: Signal<TextTrackActorsContext['textTracksActor']>;
    textTrackSegmentLoaderActor: Signal<TextTrackActorsContext['textTrackSegmentLoaderActor']>;
  };
  config: TextTrackActorsConfig;
}): () => void {
  return effect(() => {
    const mediaElement = context.mediaElement.get();
    if (!mediaElement) return;

    const textTracksActor = createTextTracksActor(mediaElement);
    const textTrackSegmentLoaderActor = createTextTrackSegmentLoaderActor(
      textTracksActor,
      config.resolveTextTrackSegment,
      { forwardBuffer: config.forwardBuffer }
    );
    context.textTracksActor.set(textTracksActor);
    context.textTrackSegmentLoaderActor.set(textTrackSegmentLoaderActor);

    return () => {
      textTracksActor.destroy();
      textTrackSegmentLoaderActor.destroy();
      context.textTracksActor.set(undefined);
      context.textTrackSegmentLoaderActor.set(undefined);
    };
  });
}

export const setupTextTrackActors = defineBehavior({
  stateKeys: [],
  contextKeys: ['mediaElement', 'textTracksActor', 'textTrackSegmentLoaderActor'],
  setup: setupTextTrackActorsSetup,
});
