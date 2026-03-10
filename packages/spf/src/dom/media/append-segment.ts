/**
 * Segment appender helper.
 *
 * Appends media data (ArrayBuffer or AsyncIterable<Uint8Array> stream) to a
 * SourceBuffer, waiting for `updateend` between calls so the browser can
 * process each append before the next one arrives.
 */

/** Data accepted by appendSegment — a full buffer or an async chunk stream. */
export type AppendData = ArrayBuffer | AsyncIterable<Uint8Array>;

/**
 * Append media data to a SourceBuffer.
 *
 * Accepts either a full ArrayBuffer (single append) or an AsyncIterable of
 * Uint8Array chunks (one append per chunk, in order). Waits for `updateend`
 * between each call so appends are serialized correctly.
 *
 * Errors from the SourceBuffer (`error` event) or from the iterable are
 * propagated as rejections.
 */
export async function appendSegment(sourceBuffer: SourceBuffer, data: AppendData, signal?: AbortSignal): Promise<void> {
  if (data instanceof ArrayBuffer) {
    await appendChunk(sourceBuffer, data);
  } else {
    for await (const chunk of data) {
      // Check between chunks so an abort can stop streaming before the next
      // appendBuffer call. The current chunk (if any) has already landed in the
      // SourceBuffer; the partial: true flag in the actor model reflects this.
      if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
      await appendChunk(sourceBuffer, chunk);
    }
  }
}

async function appendChunk(sourceBuffer: SourceBuffer, data: ArrayBuffer): Promise<void> {
  if (sourceBuffer.updating) {
    await new Promise<void>((resolve) => {
      const onUpdateEnd = () => {
        sourceBuffer.removeEventListener('updateend', onUpdateEnd);
        resolve();
      };
      sourceBuffer.addEventListener('updateend', onUpdateEnd);
    });
  }

  return new Promise<void>((resolve, reject) => {
    const onUpdateEnd = () => {
      cleanup();
      resolve();
    };

    const onError = (event: Event) => {
      cleanup();
      reject(new Error(`SourceBuffer append error: ${event.type}`));
    };

    const cleanup = () => {
      sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      sourceBuffer.removeEventListener('error', onError);
    };

    sourceBuffer.addEventListener('updateend', onUpdateEnd);
    sourceBuffer.addEventListener('error', onError);

    try {
      sourceBuffer.appendBuffer(data);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
