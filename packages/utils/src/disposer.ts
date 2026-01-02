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

  /**
   * Number of registered cleanup functions.
   */
  get size(): number {
    return this.#cleanups.size;
  }

  /**
   * Add a cleanup function to the collection.
   */
  add(cleanup: CleanupFn): void {
    this.#cleanups.add(cleanup);
  }

  /**
   * Run all cleanup functions synchronously.
   *
   * Note: If any cleanup functions return promises, they will not be awaited.
   * Use `disposeAsync()` if you have async cleanup functions.
   */
  dispose(): void {
    for (const cleanup of this.#cleanups) {
      cleanup();
    }
    this.#cleanups.clear();
  }

  /**
   * Run all cleanup functions, awaiting any promises.
   */
  async disposeAsync(): Promise<void> {
    await Promise.all([...this.#cleanups].map(cleanup => cleanup()));
    this.#cleanups.clear();
  }
}
