/**
 * Buffer flusher helper (P12)
 *
 * Removes a time range from a SourceBuffer to manage memory.
 */

/**
 * Remove a time range from a SourceBuffer.
 *
 * Waits for the SourceBuffer to be ready (not updating), then removes
 * the specified range. Returns a promise that resolves when removal completes.
 *
 * @param sourceBuffer - The SourceBuffer to remove data from
 * @param start - Start of the time range to remove (seconds)
 * @param end - End of the time range to remove (seconds)
 * @returns Promise that resolves when removal completes
 *
 * @example
 * await flushBuffer(videoSourceBuffer, 0, 30);
 */
export async function flushBuffer(sourceBuffer: SourceBuffer, start: number, end: number): Promise<void> {
  // Wait for SourceBuffer to be ready (not currently updating)
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
      reject(new Error(`SourceBuffer remove error: ${event.type}`));
    };

    const cleanup = () => {
      sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      sourceBuffer.removeEventListener('error', onError);
    };

    sourceBuffer.addEventListener('updateend', onUpdateEnd);
    sourceBuffer.addEventListener('error', onError);

    try {
      sourceBuffer.remove(start, end);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
