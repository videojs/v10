const DOUBLETAP_WINDOW = 300;

/**
 * Recognizes tap vs doubletap from quick pointer-up events.
 *
 * Stateful recognizer — tracks tap count and doubletap timing.
 * The coordinator handles pointer-down timing (tap threshold) and
 * calls `up()` only for quick taps that passed the threshold check.
 */
export class TapRecognizer {
  #lastTapTime = 0;
  #tapTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Process a confirmed quick tap.
   *
   * @param hasDoubletap - Whether doubletap bindings exist for this context.
   * @param onTap - Called when a tap is confirmed (immediately or after doubletap window).
   * @param onDoubleTap - Called when a doubletap is detected.
   */
  up(hasDoubletap: boolean, onTap: (() => void) | null, onDoubleTap: (() => void) | null): void {
    if (hasDoubletap) {
      const now = Date.now();

      if (now - this.#lastTapTime < DOUBLETAP_WINDOW) {
        // Second tap within window — doubletap.
        this.#clearTimer();
        this.#lastTapTime = 0;
        onDoubleTap?.();
        return;
      }

      // First tap — defer to allow doubletap window.
      this.#lastTapTime = now;

      if (onTap) {
        this.#clearTimer();
        this.#tapTimer = setTimeout(() => {
          this.#tapTimer = null;
          this.#lastTapTime = 0;
          onTap();
        }, DOUBLETAP_WINDOW);
      }

      return;
    }

    // No doubletap bindings — fire tap immediately.
    onTap?.();
  }

  #clearTimer(): void {
    if (this.#tapTimer !== null) {
      clearTimeout(this.#tapTimer);
      this.#tapTimer = null;
    }
  }

  reset(): void {
    this.#clearTimer();
    this.#lastTapTime = 0;
  }
}
