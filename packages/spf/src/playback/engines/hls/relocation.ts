/**
 * Non-zero-PTS relocation assembly (Tier-1). Bundles the seam values a
 * composition injects to relocate a non-zero-PTS source onto a 0-based
 * presentation timeline — kept in one module so a Tier-0 composition that never
 * calls {@link createRelocation} tree-shakes away the mp4 parser, the VTT
 * metadata scraper, and the origin discovery.
 *
 * Relocation is expressed as extra **steps** woven into the segment loader's
 * per-message pipelines (see `MessagePipelines`), not as bespoke loader config.
 * The loader ships a Tier-0 `fetch → dispatch` pipeline and stays oblivious to
 * relocation; this module returns pipelines that insert two steps between them:
 * - **tapOrigin** — a head-peek on the fetched byte stream that reads the
 *   decode-time origin (`tfdt` baseMediaDecodeTime ÷ `mdhd` timescale) and
 *   publishes the offset to a per-track signal (kept out of `state.presentation`
 *   per the lost-update hazard in the presentation-timeline model). One shared
 *   discoverer spans a track's init (timescale) and first media segment (tfdt).
 * - **stampOffset** — stamps `timestampOffset` onto the append meta, so the
 *   SourceBufferActor relocates the buffer via `SourceBuffer.timestampOffset`.
 *   Synchronous: `tapOrigin` runs earlier in the same segment's pipeline, so the
 *   offset is already published by the time it reads.
 *
 * Text has no SourceBuffer, so its offset is applied as cue arithmetic in the
 * resolver: `cueFinal = cueNative + offset`, `cueNative = LOCAL + MPEGTS/90000`
 * (`X-TIMESTAMP-MAP`) or the absolute cue time (no map). Text reads the *video*
 * offset because map-less sources (Mux) can't self-derive the origin, and awaits
 * it (unlike stampOffset) because a text segment may resolve before video
 * establishes.
 *
 * Per-track offsets (not one shared min): relocating every track by its own
 * origin keeps each earliest DTS ≥ 0 (a video-primary offset would push Mux's
 * slightly-earlier audio negative). This is the single-origin coordination axis;
 * a `min`-reduce across A/V is a later capability.
 */
import { effect } from '../../../core/signals/effect';
import { peek, type ReadonlySignal, type Signal, signal } from '../../../core/signals/primitives';
import { resolveVttSegmentWithMetadata } from '../../../media/dom/text/resolve-vtt-segment';
import { dispatchStep, fetchStep, type LoadStep, type MessagePipelines } from '../../actors/dom/segment-loader';
import type { TextTrackSegmentResolver } from '../../actors/text-track-segment-loader';
import { createOriginDiscoverer } from '../../primitives/origin-discoverer';

/** Head-peek the fetched stream, reading the decode-time origin and publishing it (see {@link createOriginDiscoverer}). */
function tapOrigin(publish: (offsetSeconds: number) => void): LoadStep {
  const discover = createOriginDiscoverer(publish);
  return async (frame) => {
    if (frame.data) frame.data = await discover(frame.data);
  };
}

/**
 * Stamp the established offset onto the append meta (no-op until it resolves).
 * Synchronous: `tapOrigin` runs earlier in the same segment's pipeline, so the
 * offset is published by now. A Tier-2 shared-`min` variant would await the
 * cross-track reduce here instead.
 */
function stampOffset(offset: ReadonlySignal<number | undefined>): LoadStep {
  return (frame) => {
    const timestampOffset = peek(offset);
    if (timestampOffset != null && frame.meta) frame.meta = { ...frame.meta, timestampOffset };
  };
}

/** Resolve once `source` holds a number — so the first text cue waits for the A/V ground truth. */
function awaitDefined(source: ReadonlySignal<number | undefined>): Promise<number> {
  const current = peek(source);
  if (current !== undefined) return Promise.resolve(current);
  return new Promise((resolve) => {
    let stop: (() => void) | undefined;
    stop = effect(() => {
      const value = source.get();
      if (value !== undefined) {
        stop?.();
        resolve(value);
      }
    });
  });
}

function createRelocatingTextResolver(offset: ReadonlySignal<number | undefined>): TextTrackSegmentResolver<VTTCue> {
  return async (url) => {
    const { cues, metadata } = await resolveVttSegmentWithMetadata(url);
    const relocationOffset = await awaitDefined(offset);
    const map = metadata.timestampMap;
    // The LOCAL→native correction is `mpegts/90000 − local`; absent map → 0.
    const mapCorrection = map?.local !== undefined ? map.mpegts / 90000 - map.local : 0;
    const delta = mapCorrection + relocationOffset;
    if (delta !== 0) {
      for (const cue of cues) {
        cue.startTime += delta;
        cue.endTime += delta;
      }
    }
    return cues;
  };
}

/** Build a track's pipelines around its own offset signal. `tapOrigin`'s discoverer is created once per actor (shared across init + segments). */
function relocatingPipelines(offset: Signal<number | undefined>): MessagePipelines {
  const publish = (offsetSeconds: number) => offset.set(offsetSeconds);
  return () => {
    // One discoverer per actor: the init establishes the timescale, the first
    // media segment establishes `tfdt` + publishes — so the same `tapOrigin`
    // step must be shared across both pipelines.
    const tap = tapOrigin(publish);
    return {
      remove: [dispatchStep],
      'append-init': [fetchStep, tap, dispatchStep],
      'append-segment': [fetchStep, tap, stampOffset(offset), dispatchStep],
    };
  };
}

/** Seam values a composition injects to enable non-zero-PTS relocation. */
export interface Relocation {
  videoMessagePipelines: MessagePipelines;
  audioMessagePipelines: MessagePipelines;
  resolveTextTrackSegment: TextTrackSegmentResolver<VTTCue>;
}

/**
 * Build the relocation seam bundle. Spread into a `SimpleHlsEngineConfig` to
 * compose a non-zero-PTS engine:
 *
 * ```ts
 * createSimpleHlsEngine({ ...config, ...createRelocation() });
 * ```
 */
export function createRelocation(): Relocation {
  const videoOffset = signal<number | undefined>(undefined);
  const audioOffset = signal<number | undefined>(undefined);
  return {
    videoMessagePipelines: relocatingPipelines(videoOffset),
    audioMessagePipelines: relocatingPipelines(audioOffset),
    resolveTextTrackSegment: createRelocatingTextResolver(videoOffset),
  };
}
