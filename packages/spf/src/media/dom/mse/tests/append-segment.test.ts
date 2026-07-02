import { describe, expect, it, vi } from 'vitest';
import { appendSegment } from '../append-segment';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSourceBuffer(): SourceBuffer {
  const listeners: Record<string, EventListener[]> = {};

  return {
    updating: false,
    abort: vi.fn(),
    appendBuffer: vi.fn(() => {
      setTimeout(() => {
        for (const listener of listeners.updateend ?? []) listener(new Event('updateend'));
      }, 0);
    }),
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners[type] ??= [];
      listeners[type].push(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener);
    }),
  } as unknown as SourceBuffer;
}

async function* chunks(...buffers: ArrayBuffer[]): AsyncGenerator<Uint8Array> {
  for (const buf of buffers) yield new Uint8Array(buf);
}

// ---------------------------------------------------------------------------
// ArrayBuffer path
// ---------------------------------------------------------------------------

describe('appendSegment', () => {
  it('calls appendBuffer once for an ArrayBuffer', async () => {
    const sb = makeSourceBuffer();
    await appendSegment(sb, new ArrayBuffer(8));
    expect(sb.appendBuffer).toHaveBeenCalledTimes(1);
  });

  it('resolves after updateend for ArrayBuffer', async () => {
    const sb = makeSourceBuffer();
    await expect(appendSegment(sb, new ArrayBuffer(4))).resolves.toBeUndefined();
  });

  it('waits for updating=false before appending', async () => {
    const listeners: Record<string, EventListener[]> = {};
    let updating = true;

    const sb = {
      get updating() {
        return updating;
      },
      appendBuffer: vi.fn(() => {
        setTimeout(() => {
          updating = false;
          for (const l of listeners.updateend ?? []) l(new Event('updateend'));
        }, 0);
      }),
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners[type] ??= [];
        listeners[type].push(listener);
      }),
      removeEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener);
      }),
    } as unknown as SourceBuffer;

    // Simulate an external updateend that clears updating
    setTimeout(() => {
      updating = false;
      for (const l of listeners.updateend ?? []) l(new Event('updateend'));
    }, 10);

    await appendSegment(sb, new ArrayBuffer(4));
    expect(sb.appendBuffer).toHaveBeenCalledOnce();
  });

  // ---------------------------------------------------------------------------
  // AsyncIterable path
  // ---------------------------------------------------------------------------

  it('calls appendBuffer once per chunk for AsyncIterable', async () => {
    const sb = makeSourceBuffer();
    await appendSegment(sb, chunks(new ArrayBuffer(4), new ArrayBuffer(4), new ArrayBuffer(4)));
    expect(sb.appendBuffer).toHaveBeenCalledTimes(3);
  });

  it('resolves after all chunks are appended', async () => {
    const sb = makeSourceBuffer();
    await expect(appendSegment(sb, chunks(new ArrayBuffer(4), new ArrayBuffer(4)))).resolves.toBeUndefined();
  });

  it('propagates errors thrown from the AsyncIterable', async () => {
    const sb = makeSourceBuffer();

    async function* errorStream(): AsyncGenerator<Uint8Array> {
      yield new Uint8Array(4);
      throw new Error('stream failed');
    }

    await expect(appendSegment(sb, errorStream())).rejects.toThrow('stream failed');
  });

  it('calls sourceBuffer.abort() and throws when signal is aborted between chunks', async () => {
    const sb = makeSourceBuffer();
    const controller = new AbortController();

    async function* twoChunks(): AsyncGenerator<Uint8Array> {
      yield new Uint8Array(4);
      controller.abort();
      yield new Uint8Array(4);
    }

    await expect(appendSegment(sb, twoChunks(), controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(sb.abort).toHaveBeenCalledOnce();
    // Only the first chunk should have been appended
    expect(sb.appendBuffer).toHaveBeenCalledOnce();
  });

  it('calls sourceBuffer.abort() when the stream itself throws an AbortError', async () => {
    const sb = makeSourceBuffer();

    async function* abortingStream(): AsyncGenerator<Uint8Array> {
      yield new Uint8Array(4);
      throw new DOMException('Aborted', 'AbortError');
    }

    await expect(appendSegment(sb, abortingStream())).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(sb.abort).toHaveBeenCalledOnce();
  });

  it('does not call sourceBuffer.abort() for non-abort stream errors', async () => {
    const sb = makeSourceBuffer();

    async function* errorStream(): AsyncGenerator<Uint8Array> {
      yield new Uint8Array(4);
      throw new Error('network error');
    }

    await expect(appendSegment(sb, errorStream())).rejects.toThrow('network error');
    expect(sb.abort).not.toHaveBeenCalled();
  });

  it('passes chunk bytes through to appendBuffer unchanged', async () => {
    const sb = makeSourceBuffer();
    const data = new Uint8Array([1, 2, 3, 4]);

    await appendSegment(
      sb,
      (async function* () {
        yield data;
      })()
    );

    const appended = (sb.appendBuffer as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(Array.from(new Uint8Array(appended as ArrayBuffer))).toEqual([1, 2, 3, 4]);
  });

  it('appends chunks in order', async () => {
    const appended: number[][] = [];

    const listeners: Record<string, EventListener[]> = {};
    const sb = {
      updating: false,
      appendBuffer: vi.fn((data: ArrayBuffer) => {
        appended.push(Array.from(new Uint8Array(data)));
        setTimeout(() => {
          for (const l of listeners.updateend ?? []) l(new Event('updateend'));
        }, 0);
      }),
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners[type] ??= [];
        listeners[type].push(listener);
      }),
      removeEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener);
      }),
    } as unknown as SourceBuffer;

    const chunk1 = new Uint8Array([1, 2]);
    const chunk2 = new Uint8Array([3, 4]);
    const chunk3 = new Uint8Array([5, 6]);

    await appendSegment(
      sb,
      (async function* () {
        yield chunk1;
        yield chunk2;
        yield chunk3;
      })()
    );

    expect(appended).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });
});
