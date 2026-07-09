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

/** Synchronous RMW of the per-track entry — disjoint keys across producers, so no lost update. */
function writeContainer(slot: ContainerSlot, trackId: string, patch: Partial<MediaContainerData>): void {
  update(slot, (current) => ({ ...current, [trackId]: { ...current?.[trackId], ...patch } }));
}

/** Init pipeline step: head-peek the `mdhd` timescale into `state.mediaContainerData[trackId]`. */
const readInitTimescale: LoadStep = async (frame, _signal, deps) => {
  const { op } = frame;
  if (op.type !== 'append-init' || !frame.data) return;
  const slot = containerSlot(deps);
  const { trackId } = op.meta;
  if (peek(slot)?.[trackId]?.timescale !== undefined) return; // already have it
  frame.data = await peekHead(frame.data, (bytes) => {
    const timescale = readFirstMediaTimescale(bytes);
    if (timescale === undefined) return false;
    writeContainer(slot, trackId, { timescale });
    return true;
  });
};

/** Media-segment pipeline step: head-peek the `tfdt` baseMediaDecodeTime into `state.mediaContainerData[trackId]`. */
const readSegmentOrigin: LoadStep = async (frame, _signal, deps) => {
  const { op } = frame;
  if (op.type !== 'append-segment' || !frame.data) return;
  const slot = containerSlot(deps);
  const { trackId } = op.meta;
  if (peek(slot)?.[trackId]?.baseMediaDecodeTime !== undefined) return; // established
  frame.data = await peekHead(frame.data, (bytes) => {
    const baseMediaDecodeTime = readFirstBaseMediaDecodeTime(bytes);
    if (baseMediaDecodeTime === undefined) return false;
    writeContainer(slot, trackId, { baseMediaDecodeTime });
    return true;
  });
};

/**
 * Media-segment stamp step. Tier 1: relocate by the track's *own* discovered origin,
 * read straight from `mediaContainerData` (populated by `readSegmentOrigin` earlier
 * in this same pipeline, so it's available synchronously). If no complete origin was
 * found — TS / containerless / a 0-PTS source — leave the append native (offset 0).
 */
const stampStartMediaTime: LoadStep = (frame, _signal, deps) => {
  const { op } = frame;
  if (op.type !== 'append-segment') return;
  const data = peek(containerSlot(deps))?.[op.meta.trackId];
  if (data?.timescale === undefined || data.baseMediaDecodeTime === undefined) return;
  // startTime is 0-based, so the relocating offset is −startMediaTime.
  frame.meta = { ...(frame.meta ?? op.meta), timestampOffset: -(data.baseMediaDecodeTime / data.timescale) };
};

/**
 * Relocation pipelines — a plain config `messagePipelines`. The same map serves
 * every track type: the steps key by the segment's own `op.meta.trackId`.
 */
export const relocationMessagePipelines: MessagePipelines = () => ({
  remove: [dispatchStep],
  'append-init': [fetchStep, readInitTimescale, dispatchStep],
  'append-segment': [fetchStep, readSegmentOrigin, stampStartMediaTime, dispatchStep],
});
