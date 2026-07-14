/**
 * Non-zero-PTS relocation loader steps — the DOM-scoped, byte-level half that pairs
 * with the `establishStartMediaTime` reactor (`../establish-start-media-time`). A
 * plain config `messagePipelines` array: `discover` (init `mdhd` timescale, media
 * `tfdt` baseMediaDecodeTime) writes `state.mediaContainerData`; `stamp` reads that
 * track's origin back and relocates via `timestampOffset = −startMediaTime`. Steps
 * read composition `state` from their call-time `deps` (no closures, no context);
 * the reactor reads the same slot to derive/consume. They coordinate only through
 * that slot — no import between the two.
 *
 * DOM-scoped only because it references the loader's base steps + `StepDeps` (which
 * carry the `SourceBuffer`-backed actor); the relocation logic itself is byte/signal
 * work. Tier 1: `stamp` computes the offset straight from the discovered origin, so
 * it's independent of the reactor's derive and works for late tracks.
 *
 * The text half (`relocatingTextPipelines`) is the same idea for the text-segment
 * loader: a `resolveWithMetadata → relocateCues → dispatchCues` pipeline that shifts
 * VTT cues onto the same 0-based timeline, reading the primary A/V track's
 * `startMediaTime` (the reactor's consumed value) via `deps`.
 */
import type { StateSignals } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import { peek, type Signal, update } from '../../../core/signals/primitives';
import { resolveVttSegmentMetadata, type TextSegmentMetadata } from '../../../media/dom/text/resolve-vtt-segment';
import { readFirstBaseMediaDecodeTime, readFirstMediaTimescale } from '../../../media/mp4/timestamp-origin';
import type { MediaContainerData } from '../../../media/types';
import { findTrackById } from '../../../media/utils/tracks';
import {
  dispatchStep,
  fetchStep,
  type LoadStep,
  type MessagePipelines,
  type StepDeps,
} from '../../actors/dom/segment-loader';
import {
  dispatchCuesStep,
  type TextLoadStep,
  type TextMessagePipelines,
  textStepWiring,
} from '../../actors/text-track-segment-loader';
import { peekHead } from '../../primitives/head-peek';
import type { DeriveStartMediaTime, EstablishStartMediaTimeState } from '../establish-start-media-time';

type ContainerSlot = Signal<Record<string, MediaContainerData> | undefined>;

/** Assert the relocation state view from the opaque step deps — this module knows the slots the composition provides. */
function relocationState(deps: StepDeps): StateSignals<EstablishStartMediaTimeState> {
  return deps.state as unknown as StateSignals<EstablishStartMediaTimeState>;
}

function containerSlot(deps: StepDeps): ContainerSlot {
  return relocationState(deps).mediaContainerData;
}

/** Synchronous RMW of the per-type entry — disjoint keys across producers, so no lost update. */
function writeContainer(slot: ContainerSlot, trackType: string, patch: Partial<MediaContainerData>): void {
  update(slot, (current) => ({ ...current, [trackType]: { ...current?.[trackType], ...patch } }));
}

/**
 * Resolve once `read()` returns a number. Shared by the A/V stamp (waits for the
 * `derive`d origin — immediate for per-type, the shared-`min` barrier for coordinated)
 * and the text step (waits for the primary A/V origin). No bound: for fMP4 the origin
 * always establishes.
 */
function awaitDefined(read: () => number | undefined): Promise<number> {
  return new Promise((resolve) => {
    let stop: (() => void) | undefined;
    stop = effect(() => {
      const value = read();
      if (value !== undefined) {
        stop?.();
        resolve(value);
      }
    });
  });
}

/**
 * Relocation pipelines for one track type — a plain config `messagePipelines`.
 * Keyed by **track type** (`'video'` / `'audio'`), so ABR rungs of a type share the
 * origin (discover skips once the type's value is present). The steps read/write
 * `state.mediaContainerData[trackType]` via their call-time `deps`; the stamp applies
 * the same `derive` seam the reactor uses (pass the composition's resolved
 * `deriveStartMediaTime` so the buffer offset and the model's `startMediaTime` agree).
 */
export function relocationPipelinesFor(trackType: 'video' | 'audio', derive: DeriveStartMediaTime): MessagePipelines {
  /** Init step: head-peek the `mdhd` timescale into `mediaContainerData[trackType]`. */
  const readInitTimescale: LoadStep = async (frame, _signal, deps) => {
    const { op } = frame;
    if (op.type !== 'append-init' || !frame.data) return;
    const slot = containerSlot(deps);
    if (peek(slot)?.[trackType]?.timescale !== undefined) return; // already have it (any rung of this type)
    frame.data = await peekHead(frame.data, (bytes) => {
      const timescale = readFirstMediaTimescale(bytes);
      if (timescale === undefined) return false;
      writeContainer(slot, trackType, { timescale });
      return true;
    });
  };

  /**
   * Media-segment step: head-peek the `tfdt` baseMediaDecodeTime, recording the
   * segment's 0-based `startTime` with it — the origin is `bmdt/ts − segmentStartTime`,
   * so the first *loaded* segment need not be the 0th.
   */
  const readSegmentOrigin: LoadStep = async (frame, _signal, deps) => {
    const { op } = frame;
    if (op.type !== 'append-segment' || !frame.data) return;
    const slot = containerSlot(deps);
    if (peek(slot)?.[trackType]?.baseMediaDecodeTime !== undefined) return; // established
    const segmentStartTime = op.meta.startTime;
    frame.data = await peekHead(frame.data, (bytes) => {
      const baseMediaDecodeTime = readFirstBaseMediaDecodeTime(bytes);
      if (baseMediaDecodeTime === undefined) return false;
      writeContainer(slot, trackType, { baseMediaDecodeTime, segmentStartTime });
      return true;
    });
  };

  /**
   * Stamp step — tier-agnostic apply. Relocate by the `derive`d `startMediaTime` for
   * this type (`offset = −startMediaTime`). Applies the **same** `derive` the reactor
   * uses, over the shared `mediaContainerData` slot — so the buffer offset matches the
   * model's stamped `startMediaTime`, and it's robust to `established` + late tracks
   * (the slot persists; the model value may not be re-stamped after the reactor goes
   * sticky). Awaited: per-type resolves at once (own origin discovered earlier in this
   * pipeline); shared-`min` waits until every selected A/V origin is in — the barrier,
   * filled by the other type's discover step. A derived `0` (0-PTS / below threshold)
   * leaves the append native — setting `timestampOffset` at all can ripple.
   */
  const stampStartMediaTime: LoadStep = async (frame, signal, deps) => {
    if (frame.op.type !== 'append-segment') return;
    const state = relocationState(deps);
    // Liveness guard: if THIS type's own origin wasn't discovered — `readSegmentOrigin`
    // ran earlier in this pipeline and found no `tfdt` (mock / TS / containerless) — the
    // source isn't relocatable, so leave the append native and DON'T wait. Only a
    // discoverable type awaits the derived origin (which for shared-`min` legitimately
    // blocks on the other selected type — the barrier).
    const own = peek(state.mediaContainerData)?.[trackType];
    if (own?.timescale === undefined || own.baseMediaDecodeTime === undefined || own.segmentStartTime === undefined) {
      return;
    }
    const startMediaTime = await awaitDefined(() => {
      const containerData = state.mediaContainerData.get();
      if (!containerData) return undefined;
      return derive(containerData, {
        selectedVideoTrackId: state.selectedVideoTrackId?.get(),
        selectedAudioTrackId: state.selectedAudioTrackId?.get(),
      })[trackType];
    });
    if (signal.aborted || startMediaTime === 0) return;
    frame.meta = { ...(frame.meta ?? frame.op.meta), timestampOffset: -startMediaTime };
  };

  return () => ({
    remove: [dispatchStep],
    'append-init': [fetchStep, readInitTimescale, dispatchStep],
    'append-segment': [fetchStep, readSegmentOrigin, stampStartMediaTime, dispatchStep],
  });
}

// ============================================================================
// TEXT (cue relocation)
// ============================================================================

/**
 * Resolve step for the relocation text pipeline. Reuses the injected host resolver
 * (the loader's folded `resolveSegment`, via `textStepWiring`) for cues and fetches
 * the `X-TIMESTAMP-MAP` header in parallel, stashing it on `frame.metadata` for
 * `relocateCuesStep`. Replaces the
 * base `resolveCuesStep` (which fetches cues only) — text's native `<track>` parser
 * discards the header, so the map needs its own raw-bytes fetch.
 */
const resolveWithMetadataStep: TextLoadStep<VTTCue> = async (frame, signal, deps) => {
  const [cues, metadata] = await Promise.all([
    textStepWiring<VTTCue>(deps).resolveSegment(frame.op.segment.url),
    resolveVttSegmentMetadata(frame.op.segment.url),
  ]);
  if (signal.aborted) return;
  frame.cues = cues;
  frame.metadata = metadata;
};

/**
 * Relocate step — shifts each VTT cue onto the 0-based presentation timeline:
 * `cueFinal = cueNative − startMediaTime`, where `startMediaTime` is the primary
 * A/V track's origin (selected **video**, else **audio** — the single-anchor rule,
 * and defensive like the reactor's optional selection) and `cueNative` folds in the
 * `X-TIMESTAMP-MAP` correction (`mpegts/90000 − local`) for map-bearing VTT (Apple)
 * or is the absolute cue time (no map, e.g. Mux). Text can resolve before A/V
 * establishes, so the origin is awaited; fMP4 always establishes it (0-PTS → 0),
 * and a text-only source (no A/V selected) simply gets offset 0.
 */
const relocateCuesStep: TextLoadStep<VTTCue> = async (frame, signal, deps) => {
  if (!frame.cues?.length) return;
  const state = deps.state as unknown as StateSignals<EstablishStartMediaTimeState>;
  const startMediaTime = await awaitDefined(() => {
    const primaryId = state.selectedVideoTrackId.get() ?? state.selectedAudioTrackId.get();
    if (primaryId === undefined) return 0;
    const presentation = state.presentation.get();
    return presentation ? findTrackById(presentation, primaryId)?.startMediaTime : undefined;
  });
  if (signal.aborted) return;
  const { timestampMap } = (frame.metadata as TextSegmentMetadata | undefined) ?? {};
  const mapCorrection = timestampMap ? timestampMap.mpegts / 90000 - timestampMap.local : 0;
  const delta = mapCorrection - startMediaTime;
  if (delta !== 0) {
    for (const cue of frame.cues) {
      cue.startTime += delta;
      cue.endTime += delta;
    }
  }
};

/**
 * Relocation text pipeline — the text analog of `relocationPipelinesFor(type)`.
 * `resolveWithMetadata` (cues + `X-TIMESTAMP-MAP`) → `relocateCues` (shift by the
 * primary A/V origin) → `dispatchCues`.
 */
export const relocatingTextPipelines: TextMessagePipelines<VTTCue> = () => [
  resolveWithMetadataStep,
  relocateCuesStep,
  dispatchCuesStep,
];
