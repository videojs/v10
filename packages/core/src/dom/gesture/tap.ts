const TAP_THRESHOLD = 250;
const DOUBLETAP_WINDOW = 300;

export interface TapResult {
  type: 'tap' | 'doubletap';
}

/**
 * Recognizes tap and doubletap gestures from pointer events.
 *
 * Stateful recognizer — tracks pointer timing, tap count, and
 * doubletap disambiguation. Does not know about bindings, regions,
 * or pointer filtering — those are the coordinator's concern.
 */
export class TapRecognizer {
  #pointerDownTime = 0;
  #lastTapTime = 0;
  #tapTimer: ReturnType<typeof setTimeout> | null = null;

  /** Record pointer down timestamp. Call on every pointerdown. */
  down(): void {
    this.#pointerDownTime = Date.now();
  }

  /**
   * Process a pointer up event.
   *
   * @param hasDoubletap - Whether doubletap bindings exist for this context.
   * @param onTap - Called when a tap is confirmed (immediately or after doubletap window).
   * @param onDoubleTap - Called when a doubletap is detected.
   */
  up(hasDoubletap: boolean, onTap: (() => void) | null, onDoubleTap: (() => void) | null): void {
    // Not a quick tap — ignore.
    if (Date.now() - this.#pointerDownTime > TAP_THRESHOLD) return;

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
    this.#pointerDownTime = 0;
  }
}
