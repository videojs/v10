/**
 * Segment appender helper (P11)
 *
 * Appends media segments (ArrayBuffer) to SourceBuffer.
 */

/**
 * Append a media segment to a SourceBuffer.
 *
 * Waits for the SourceBuffer to be ready (not updating), then appends
 * the segment data. Returns a promise that resolves when append completes.
 *
 * @param sourceBuffer - The SourceBuffer to append to
 * @param segmentData - The segment data as ArrayBuffer
 * @returns Promise that resolves when append completes
 *
 * @example
 * const data = await fetch(segmentUrl).then(r => r.arrayBuffer());
 * await appendSegment(videoSourceBuffer, data);
 */
export async function appendSegment(sourceBuffer: SourceBuffer, segmentData: ArrayBuffer): Promise<void> {
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

  // Append the segment data
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
      sourceBuffer.appendBuffer(segmentData);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
