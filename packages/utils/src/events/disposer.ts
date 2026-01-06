/**
 * A cleanup function that may be sync or async.
 */
export type CleanupFn = () => void | Promise<void>;

/**
 * A collector for cleanup functions.
 *
 * Allows registering multiple cleanup functions and disposing them all at once.
 *
 * @example
 * ```ts
 * const disposer = new Disposer();
 *
 * disposer.add(listen(video, 'play', handlePlay));
 * disposer.add(listen(video, 'pause', handlePause));
 * disposer.add(animationFrame(render));
 *
 * // Later, clean up everything at once
 * disposer.dispose();
 * // or for async cleanups:
 * await disposer.disposeAsync();
 * ```
 */
export class Disposer {
  #cleanups = new Set<CleanupFn>();

  get size(): number {
    return this.#cleanups.size;
  }

  add(cleanup: CleanupFn): void {
    this.#cleanups.add(cleanup);
  }

  /** Run all cleanups sync. Use `disposeAsync()` for async cleanups. */
  dispose(): void {
    for (const cleanup of this.#cleanups) {
      cleanup();
    }
    this.#cleanups.clear();
  }

  async disposeAsync(): Promise<void> {
    await Promise.all([...this.#cleanups].map(cleanup => cleanup()));
    this.#cleanups.clear();
  }
}
