/**
 * Request an animation frame with cleanup.
 *
 * @example
 * ```ts
 * const cancel = animationFrame((time) => console.log('Frame at', time));
 * cancel(); // Cancel if needed
 * ```
 */
export function animationFrame(callback: FrameRequestCallback): () => void {
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
}

/** Holds RAF ids while a two-frame deferred task is pending; both are `0` when idle. */
export interface DoubleAnimationFrameHandles {
  first: number;
  second: number;
}

/** Reset handles to inactive (typically after cancelAnimationFrame). */
export function resetDoubleAnimationFrameHandles(handles: DoubleAnimationFrameHandles): void {
  handles.first = 0;
  handles.second = 0;
}

/**
 * Run `run` after two consecutive animation frames, but only while `shouldContinue()` stays true before each nested frame.
 * Used across the repo to flush style/layout so the browser paints the pre-transition ("from") state before CSS transitions animate.
 *
 * Runs `shouldContinue()` before nesting the inner frame. If you need the outer frame to **always**
 * enqueue the inner frame and only invalidate inside the inner callback (some transition promises rely on this), keep an explicit nested `requestAnimationFrame` instead.
 *
 * Passing the same mutable `handles` each time replaces any pending two-frame sequence (cancellation).
 */
export function scheduleDoubleAnimationFrame(
  handles: DoubleAnimationFrameHandles,
  shouldContinue: () => boolean,
  run: () => void
): void {
  cancelAnimationFrame(handles.first);
  cancelAnimationFrame(handles.second);
  resetDoubleAnimationFrameHandles(handles);

  handles.first = requestAnimationFrame(() => {
    if (!shouldContinue()) {
      resetDoubleAnimationFrameHandles(handles);
      return;
    }

    handles.first = 0;
    handles.second = requestAnimationFrame(() => {
      if (!shouldContinue()) {
        resetDoubleAnimationFrameHandles(handles);
        return;
      }

      handles.second = 0;
      run();
    });
  });
}

/** Fire-and-forget {@link scheduleDoubleAnimationFrame}; no cancellation tracking. */
export function afterDoubleAnimationFrame(shouldContinue: () => boolean, run: () => void): void {
  const handles: DoubleAnimationFrameHandles = { first: 0, second: 0 };
  scheduleDoubleAnimationFrame(handles, shouldContinue, run);
}
