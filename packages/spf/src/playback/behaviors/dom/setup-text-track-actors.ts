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
import { peek, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import { resolveVttSegmentWithMetadata } from '../../../media/dom/text/resolve-vtt-segment';
import type { SegmentLoaderActor } from '../../actors/dom/segment-loader';
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
  /**
   * Read-only, for cue rebasing under non-zero-PTS relocation (spike). The video
   * loader establishes the shared decode-time offset and publishes it on its
   * snapshot; the relocating resolver below reads it so text cues land on the
   * same 0-based timeline as the relocated A/V.
   */
  videoSegmentLoaderActor?: SegmentLoaderActor | undefined;
}

export interface TextTrackActorsConfig extends TextTrackSegmentLoaderActorConfig {
  resolveTextTrackSegment: TextTrackSegmentResolver<VTTCue>;
  /**
   * Non-zero-PTS relocation (spike). When on, cues are rebased onto the relocated
   * 0-based presentation timeline: `cueFinal = cueNative + timestampOffset`, where
   * `cueNative = LOCAL + MPEGTS/90000` (`X-TIMESTAMP-MAP`) or the absolute cue time
   * (no map), and `timestampOffset` is the video loader's established relocation
   * offset. Off → the injected resolver is used unchanged (Tier 0).
   */
  relocateTimestampOrigin?: boolean;
}

/**
 * Resolve when the video loader has published its relocation offset (spike). Text
 * cues can't self-derive the origin for map-less sources (Mux), so the first text
 * segment must wait for the A/V ground truth rather than land ~60s off.
 */
function awaitRelocationOffset(videoLoader: ReadonlySignal<SegmentLoaderActor | undefined>): Promise<number> {
  const read = (): number | null => {
    const actor = peek(videoLoader);
    return actor ? peek(actor.snapshot).context.relocationOffset : null;
  };
  const current = read();
  if (current !== null) return Promise.resolve(current);
  return new Promise((resolve) => {
    let stop: (() => void) | undefined;
    stop = effect(() => {
      const actor = videoLoader.get();
      const offset = actor ? actor.snapshot.get().context.relocationOffset : null;
      if (offset !== null) {
        stop?.();
        resolve(offset);
      }
    });
  });
}

/**
 * Wrap a cue resolver so cues are rebased onto the relocated 0-based timeline
 * (spike). `X-TIMESTAMP-MAP` (Apple) puts cues at LOCAL time and the map's
 * `mpegts/90000 − local` corrects them to the media timeline; absolute cues (Mux)
 * need no correction. Both then shift by the video loader's relocation offset.
 */
function makeRelocatingResolver(
  videoLoader: ReadonlySignal<SegmentLoaderActor | undefined>
): TextTrackSegmentResolver<VTTCue> {
  return async (url) => {
    const { cues, metadata } = await resolveVttSegmentWithMetadata(url);
    const offset = await awaitRelocationOffset(videoLoader);
    const map = metadata.timestampMap;
    const mapCorrection = map?.local !== undefined ? map.mpegts / 90000 - map.local : 0;
    const delta = mapCorrection + offset;
    if (delta !== 0) {
      for (const cue of cues) {
        cue.startTime += delta;
        cue.endTime += delta;
      }
    }
    return cues;
  };
}

function setupTextTrackActorsSetup({
  context,
  config,
}: {
  context: {
    mediaElement: ReadonlySignal<TextTrackActorsContext['mediaElement']>;
    textTracksActor: Signal<TextTrackActorsContext['textTracksActor']>;
    textTrackSegmentLoaderActor: Signal<TextTrackActorsContext['textTrackSegmentLoaderActor']>;
    videoSegmentLoaderActor: ReadonlySignal<TextTrackActorsContext['videoSegmentLoaderActor']>;
  };
  config: TextTrackActorsConfig;
}): () => void {
  return effect(() => {
    const mediaElement = context.mediaElement.get();
    if (!mediaElement) return;

    const resolveTextTrackSegment = config.relocateTimestampOrigin
      ? makeRelocatingResolver(context.videoSegmentLoaderActor)
      : config.resolveTextTrackSegment;

    const textTracksActor = createTextTracksActor(mediaElement);
    const textTrackSegmentLoaderActor = createTextTrackSegmentLoaderActor(textTracksActor, resolveTextTrackSegment, {
      forwardBuffer: config.forwardBuffer,
    });
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
  contextKeys: ['mediaElement', 'textTracksActor', 'textTrackSegmentLoaderActor', 'videoSegmentLoaderActor'],
  setup: setupTextTrackActorsSetup,
});
