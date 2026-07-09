/**
 * Eager head-of-stream peek. Pulls chunks from an async byte stream only until
 * `tryParse` signals it has read what it needs (or the stream ends), then returns
 * a stream that re-emits the pulled head followed by the untouched tail — so
 * reading a head-of-stream mp4 box (`mdhd` / `tfdt`) doesn't break streaming of
 * the append. Once the caller has what it wants, the rest streams as normal.
 */

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

/**
 * Pull chunks until `tryParse(accumulatedHead)` returns `true` — it found and read
 * its box — or the stream ends, then return a stream re-emitting the pulled head
 * followed by the untouched tail. `tryParse` is called with the growing head after
 * each chunk; it performs the side effect (publishing the parsed value) and returns
 * whether it's done.
 */
export async function peekHead(
  data: AsyncIterable<Uint8Array>,
  tryParse: (bytes: Uint8Array) => boolean
): Promise<AsyncIterable<Uint8Array>> {
  const iterator = data[Symbol.asyncIterator]();
  const head: Uint8Array[] = [];
  for (let next = await iterator.next(); !next.done; next = await iterator.next()) {
    head.push(next.value);
    if (tryParse(concat(head))) break;
  }
  return reassemble(head, iterator);
}
