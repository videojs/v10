/**
 * HTMLMediaElement Setup
 *
 * Utilities for working with HTMLMediaElement lifecycle events.
 */

/**
 * Wait until `mediaElement.readyState >= HAVE_METADATA` (the next
 * `loadedmetadata` event), or until `signal` aborts — whichever fires
 * first.
 *
 * Resolves immediately when `readyState` is already at or past
 * `HAVE_METADATA` (no further transition is coming, so there's nothing to
 * wait for).
 *
 * Companion to the MediaSource-side `waitForMediaSourceOpen` for one-shot
 * use in async sequences (e.g., a behavior's reactor entry that needs to
 * wait for the element to parse the container's metadata before performing
 * a spec-conforming mutation that requires `HAVE_METADATA`).
 *
 * @example
 * await waitForMediaElementMetadata(mediaElement, signal);
 * if (signal.aborted) return;
 * // safe to assume metadata-dependent state is populated
 */
export function waitForMediaElementMetadata(mediaElement: HTMLMediaElement, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  if (mediaElement.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const done = () => resolve();
    const options = { once: true, signal };
    mediaElement.addEventListener('loadedmetadata', done, options);
    signal.addEventListener('abort', done, { once: true });
  });
}
