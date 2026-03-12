import { describe, expect, it } from 'vitest';
import { ChunkedStreamIterable } from '../chunked-stream-iterable';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStream(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(chunks[i++]);
      } else {
        controller.close();
      }
    },
  });
}

function bytes(size: number, fill = 1): Uint8Array {
  return new Uint8Array(size).fill(fill);
}

async function collect(iterable: AsyncIterable<Uint8Array>): Promise<Uint8Array[]> {
  const result: Uint8Array[] = [];
  for await (const chunk of iterable) {
    result.push(chunk);
  }
  return result;
}

function totalBytes(chunks: Uint8Array[]): number {
  return chunks.reduce((sum, c) => sum + c.length, 0);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChunkedStreamIterable', () => {
  it('exposes minChunkSize', () => {
    const stream = makeStream();
    const iterable = new ChunkedStreamIterable(stream, { minChunkSize: 1024 });
    expect(iterable.minChunkSize).toBe(1024);
  });

  it('defaults minChunkSize to 128 KB', () => {
    const stream = makeStream();
    const iterable = new ChunkedStreamIterable(stream);
    expect(iterable.minChunkSize).toBe(2 ** 17);
  });

  it('yields a single chunk when it meets minChunkSize exactly', async () => {
    const minChunkSize = 64;
    const stream = makeStream(bytes(64));
    const chunks = await collect(new ChunkedStreamIterable(stream, { minChunkSize }));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.length).toBe(64);
  });

  it('yields a single chunk when it exceeds minChunkSize', async () => {
    const minChunkSize = 64;
    const stream = makeStream(bytes(100));
    const chunks = await collect(new ChunkedStreamIterable(stream, { minChunkSize }));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.length).toBe(100);
  });

  it('accumulates small chunks until minChunkSize is met', async () => {
    const minChunkSize = 64;
    // 3 × 30-byte chunks — first two should accumulate, third triggers flush at 90 bytes
    const stream = makeStream(bytes(30, 1), bytes(30, 2), bytes(30, 3));
    const chunks = await collect(new ChunkedStreamIterable(stream, { minChunkSize }));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.length).toBe(90);
  });

  it('flushes remaining bytes on stream end even if below minChunkSize', async () => {
    const minChunkSize = 128;
    const stream = makeStream(bytes(50));
    const chunks = await collect(new ChunkedStreamIterable(stream, { minChunkSize }));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.length).toBe(50);
  });

  it('preserves all bytes across multiple yielded chunks', async () => {
    const minChunkSize = 50;
    // 3 × 40-byte chunks → first two accumulate to 80 (≥50, yield), third is remainder
    const stream = makeStream(bytes(40, 1), bytes(40, 2), bytes(40, 3));
    const chunks = await collect(new ChunkedStreamIterable(stream, { minChunkSize }));
    expect(totalBytes(chunks)).toBe(120);
  });

  it('concatenates chunk bytes correctly', async () => {
    const minChunkSize = 4;
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4]);
    const stream = makeStream(a, b);
    const chunks = await collect(new ChunkedStreamIterable(stream, { minChunkSize }));
    expect(chunks).toHaveLength(1);
    expect(Array.from(chunks[0]!)).toEqual([1, 2, 3, 4]);
  });

  it('yields nothing for an empty stream', async () => {
    const stream = makeStream();
    const chunks = await collect(new ChunkedStreamIterable(stream, { minChunkSize: 64 }));
    expect(chunks).toHaveLength(0);
  });

  it('propagates errors from the underlying stream', async () => {
    const errorStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('network failure'));
      },
    });

    await expect(collect(new ChunkedStreamIterable(errorStream, { minChunkSize: 64 }))).rejects.toThrow(
      'network failure'
    );
  });

  it('releases the reader lock after normal completion', async () => {
    const stream = makeStream(bytes(10));
    const iterable = new ChunkedStreamIterable(stream, { minChunkSize: 64 });
    await collect(iterable);
    // If lock was not released, getReader() would throw
    expect(() => stream.getReader()).not.toThrow();
  });

  it('releases the reader lock after an error', async () => {
    const errorStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('fail'));
      },
    });

    const iterable = new ChunkedStreamIterable(errorStream, { minChunkSize: 64 });
    await expect(collect(iterable)).rejects.toThrow();
    // Lock should be released even though we errored
    expect(errorStream.locked).toBe(false);
  });

  it('handles multiple large chunks correctly', async () => {
    const minChunkSize = 50;
    // Each chunk already meets minChunkSize → each yielded individually
    const stream = makeStream(bytes(60, 1), bytes(70, 2), bytes(80, 3));
    const chunks = await collect(new ChunkedStreamIterable(stream, { minChunkSize }));
    expect(chunks).toHaveLength(3);
    expect(chunks[0]!.length).toBe(60);
    expect(chunks[1]!.length).toBe(70);
    expect(chunks[2]!.length).toBe(80);
  });
});
