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
 */
import type { StateSignals } from '../../../core/composition/create-composition';
import { peek, type Signal, update } from '../../../core/signals/primitives';
import { readFirstBaseMediaDecodeTime, readFirstMediaTimescale } from '../../../media/mp4/timestamp-origin';
import type { MediaContainerData } from '../../../media/types';
import {
  dispatchStep,
  fetchStep,
  type LoadStep,
  type MessagePipelines,
  type StepDeps,
} from '../../actors/dom/segment-loader';
import { peekHead } from '../../primitives/head-peek';
import type { EstablishStartMediaTimeState } from '../establish-start-media-time';

type ContainerSlot = Signal<Record<string, MediaContainerData> | undefined>;

/** Assert the relocation state view from the opaque step deps — this module knows the slots the composition provides. */
function containerSlot(deps: StepDeps): ContainerSlot {
  return (deps.state as unknown as StateSignals<EstablishStartMediaTimeState>).mediaContainerData;
}

/** Synchronous RMW of the per-type entry — disjoint keys across producers, so no lost update. */
function writeContainer(slot: ContainerSlot, trackType: string, patch: Partial<MediaContainerData>): void {
  update(slot, (current) => ({ ...current, [trackType]: { ...current?.[trackType], ...patch } }));
}

/**
 * Relocation pipelines for one track type — a plain config `messagePipelines`.
 * Keyed by **track type** (`'video'` / `'audio'`), so ABR rungs of a type share the
 * origin (discover skips once the type's value is present). The steps read/write
 * `state.mediaContainerData[trackType]` via their call-time `deps`.
 */
export function relocationPipelinesFor(trackType: 'video' | 'audio'): MessagePipelines {
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
   * Stamp step. Tier 1: relocate by this type's *own* discovered origin, read
   * straight from `mediaContainerData` (populated by `readSegmentOrigin` earlier in
   * this pipeline, so it's synchronous). If no complete origin was found — TS /
   * containerless / a 0-PTS source — leave the append native (offset 0).
   */
  const stampStartMediaTime: LoadStep = (frame, _signal, deps) => {
    const { op } = frame;
    if (op.type !== 'append-segment') return;
    const data = peek(containerSlot(deps))?.[trackType];
    if (
      data?.timescale === undefined ||
      data.baseMediaDecodeTime === undefined ||
      data.segmentStartTime === undefined
    ) {
      return;
    }
    // startMediaTime = baseMediaDecodeTime/timescale − segmentStartTime; offset = −startMediaTime.
    frame.meta = {
      ...(frame.meta ?? op.meta),
      timestampOffset: data.segmentStartTime - data.baseMediaDecodeTime / data.timescale,
    };
  };

  return () => ({
    remove: [dispatchStep],
    'append-init': [fetchStep, readInitTimescale, dispatchStep],
    'append-segment': [fetchStep, readSegmentOrigin, stampStartMediaTime, dispatchStep],
  });
}
