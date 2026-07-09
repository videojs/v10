/**
 * Non-zero-PTS **discover**: a slim, eager head-peek decoration on a segment's
 * byte stream that reads the decode-time origin and publishes the relocation
 * offset — the content-inspection half of relocation, kept out of the fetch
 * (transport) abstraction.
 *
 * Tier-1-only — the always-present segment loader never imports this; a
 * relocating composition injects it as the loader's `discover` seam, so the mp4
 * parser tree-shakes out of a Tier-0 build.
 *
 * Unlike a throughput/failover fetch tap (which observes chunks *post-hoc*, as
 * the appender pulls them), discovery feeds the *same* segment's append —
 * `SourceBuffer.timestampOffset` must be set before the frames append — so it
 * reads the head **eagerly**: pull chunks only until the boxes parse (usually
 * one), publish, then re-emit the pulled head followed by the untouched tail, so
 * the append still **streams**. The init segment carries `mdhd` timescale, a
 * media segment carries `tfdt` baseMediaDecodeTime (both readers return
 * `undefined` when their box is absent, so one discoverer handles both and
 * self-discriminates). Once established it's a pure pass-through.
 */
import { readFirstBaseMediaDecodeTime, readFirstMediaTimescale } from '../../media/mp4/timestamp-origin';

function concat(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 1) return chunks[0]!;
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Re-emit the eagerly-pulled head chunks, then stream the untouched tail. */
async function* reassemble(head: Uint8Array[], tail: AsyncIterator<Uint8Array>): AsyncIterable<Uint8Array> {
  yield* head;
  for (let next = await tail.next(); !next.done; next = await tail.next()) yield next.value;
}

export function createOriginDiscoverer(
  publish: (offsetSeconds: number) => void
): (data: AsyncIterable<Uint8Array>) => Promise<AsyncIterable<Uint8Array>> {
  let timescale: number | undefined;
  let established = false;
  return async (data) => {
    if (established) return data;
    const iterator = data[Symbol.asyncIterator]();
    const head: Uint8Array[] = [];
    for (let next = await iterator.next(); !next.done; next = await iterator.next()) {
      head.push(next.value);
      const bytes = concat(head);
      timescale ??= readFirstMediaTimescale(bytes);
      const baseMediaDecodeTime = readFirstBaseMediaDecodeTime(bytes);
      if (baseMediaDecodeTime !== undefined && timescale !== undefined) {
        publish(-(baseMediaDecodeTime / timescale));
        established = true;
        break;
      }
      // Init data (timescale but no `moof`) — nothing more to peek here.
      if (timescale !== undefined) break;
    }
    return reassemble(head, iterator);
  };
}
