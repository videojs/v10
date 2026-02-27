import { createState, type State } from '@videojs/store';
import { listen } from '@videojs/utils/dom';
import { throttle } from '@videojs/utils/function';
import { clamp, roundToStep } from '@videojs/utils/number';
import { isNull } from '@videojs/utils/predicate';
import type { SliderInteraction } from '../../core/ui/slider/slider-core';
import { getPercentFromPointerEvent } from '../utils/pointer';
import type { UIKeyboardEvent, UIPointerEvent } from './event';

export interface SliderOptions {
  /** Element reference for getBoundingClientRect() and pointer capture. */
  getElement: () => HTMLElement;

  /** Optional thumb element reference for programmatic focus on pointerdown. */
  getThumbElement?: (() => HTMLElement | null) | undefined;

  getOrientation: () => 'horizontal' | 'vertical';
  isRTL: () => boolean;
  isDisabled: () => boolean;

  /** Current value as 0–100 percent. Used by keyboard stepping. */
  getPercent: () => number;
  /** Step size as 0–100 percent. Arrow keys. */
  getStepPercent: () => number;
  /** Large step size as 0–100 percent. Page Up/Down, Shift+Arrow. */
  getLargeStepPercent: () => number;

  /**
   * Trailing-edge throttle (ms) for `onValueCommit` during drag. When `> 0`,
   * `onValueCommit` fires periodically while dragging, then a final unthrottled
   * commit fires on pointer release. `0` (default) disables — commits only on release.
   */
  commitThrottle?: number | undefined;

  onValueChange?: ((percent: number) => void) | undefined;
  onValueCommit?: ((percent: number) => void) | undefined;
  onDragStart?: (() => void) | undefined;
  onDragEnd?: (() => void) | undefined;
}

export interface SliderRootProps {
  onPointerDown: (event: UIPointerEvent) => void;
  onPointerMove: (event: UIPointerEvent) => void;
  onPointerLeave: (event: UIPointerEvent) => void;
}

export interface SliderThumbProps {
  onKeyDown: (event: UIKeyboardEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export interface SliderHandle {
  interaction: State<SliderInteraction>;
  rootProps: SliderRootProps;
  thumbProps: SliderThumbProps;
  destroy: () => void;
}

/** Intentional drag threshold — number of pointermove events before drag starts. */
const DRAG_THRESHOLD = 2;

export function createSlider(options: SliderOptions): SliderHandle {
  const state = createState<SliderInteraction>({
    pointerPercent: 0,
    dragPercent: 0,
    dragging: false,
    pointing: false,
    focused: false,
  });

  const abort = new AbortController();
  const commitThrottleMs = options.commitThrottle ?? 0;

  let isDragging = false,
    moveCount = 0,
    cachedRTL = false,
    cachedRect: DOMRect | null = null,
    documentCleanup: (() => void) | null = null,
    capturedPointerId: number | null = null;

  const throttledCommit =
    commitThrottleMs > 0 ? throttle((percent: number) => options.onValueCommit?.(percent), commitThrottleMs) : null;

  function releaseCapture(): void {
    if (isNull(capturedPointerId)) return;

    const id = capturedPointerId;
    capturedPointerId = null;

    try {
      options.getElement().releasePointerCapture(id);
    } catch {
      // Pointer may already have been released by the browser (e.g., after pointerup).
    }
  }

  function endDrag(): void {
    if (!isDragging) {
      state.patch({ pointing: false, pointerPercent: 0 });
    } else {
      isDragging = false;
      state.patch({ dragging: false, pointing: false, pointerPercent: 0 });
      options.onDragEnd?.();
    }

    cleanup();
  }

  function cleanup() {
    throttledCommit?.cancel();
    releaseCapture();
    documentCleanup?.();
    documentCleanup = null;
    cachedRect = null;
  }

  function onDocumentPointerMove(event: PointerEvent): void {
    // Stale drag safety: if buttons === 0 for non-touch, browser lost the pointerup.
    if (event.pointerType !== 'touch' && event.buttons === 0) {
      endDrag();
      return;
    }

    moveCount++;

    const percent = getPercentFromPointerEvent(event, cachedRect!, options.getOrientation(), cachedRTL);

    if (!isDragging && moveCount >= DRAG_THRESHOLD) {
      isDragging = true;
      state.patch({ dragging: true, dragPercent: percent, pointerPercent: percent });
      options.onDragStart?.();
      options.onValueChange?.(percent);
      throttledCommit?.(percent);
    } else if (isDragging) {
      state.patch({ dragPercent: percent, pointerPercent: percent });
      options.onValueChange?.(percent);
      throttledCommit?.(percent);
    } else {
      // Below drag threshold — update hover preview only.
      state.patch({ pointerPercent: percent });
    }
  }

  function onDocumentPointerUp(event: PointerEvent): void {
    const percent = getPercentFromPointerEvent(event, cachedRect!, options.getOrientation(), cachedRTL);

    // Cancel pending throttled commit before the final unthrottled one.
    throttledCommit?.cancel();
    options.onValueCommit?.(percent);
    endDrag();
  }

  function addDocumentListeners(): void {
    const abort = new AbortController();
    const signal = abort.signal;

    listen(document, 'pointermove', onDocumentPointerMove, { passive: true, signal });
    listen(document, 'pointerup', onDocumentPointerUp, { signal });
    listen(document, 'pointercancel', endDrag, { signal });
    listen(document, 'touchmove', (e) => e.preventDefault(), { passive: false, signal });

    documentCleanup = () => abort.abort();
  }

  // --- Root props ---
  const rootProps: SliderRootProps = {
    onPointerDown(event) {
      if (options.isDisabled()) return;

      const el = options.getElement();

      cachedRect = el.getBoundingClientRect();
      cachedRTL = options.isRTL();
      moveCount = 0;

      releaseCapture();
      capturedPointerId = event.pointerId;
      el.setPointerCapture(event.pointerId);

      const percent = getPercentFromPointerEvent(event, cachedRect, options.getOrientation(), cachedRTL);

      state.patch({ pointing: true, pointerPercent: percent, dragPercent: percent });
      options.onValueChange?.(percent);

      // Focus the thumb for keyboard follow-up and screen reader tracking.
      options.getThumbElement?.()?.focus();

      documentCleanup?.();
      addDocumentListeners();
    },

    onPointerMove(event) {
      if (options.isDisabled() || isDragging) return;

      const el = options.getElement();
      const rect = el.getBoundingClientRect();
      const percent = getPercentFromPointerEvent(event, rect, options.getOrientation(), options.isRTL());

      state.patch({ pointing: true, pointerPercent: percent });
    },

    onPointerLeave() {
      if (isDragging) return;
      state.patch({ pointing: false, pointerPercent: 0 });
    },
  };

  // --- Thumb props ---
  const thumbProps: SliderThumbProps = {
    onKeyDown(event) {
      if (options.isDisabled()) {
        if (event.key !== 'Tab') event.preventDefault();
        return;
      }

      const stepPercent = options.getStepPercent();
      const largeStepPercent = options.getLargeStepPercent();
      const currentPercent = options.getPercent();

      // Round to nearest step before stepping to prevent drift from pointer drags.
      const rounded = roundToStep(currentPercent, stepPercent, 0);

      const rtl = options.isRTL();

      // Horizontal arrows flip for RTL. Vertical arrows are unaffected.
      const horizontalSign = rtl ? -1 : 1;

      const step = event.shiftKey ? largeStepPercent : stepPercent;

      let newPercent: number | null = null;

      switch (event.key) {
        case 'ArrowRight':
          newPercent = rounded + step * horizontalSign;
          break;
        case 'ArrowLeft':
          newPercent = rounded - step * horizontalSign;
          break;
        case 'ArrowUp':
          newPercent = rounded + step;
          break;
        case 'ArrowDown':
          newPercent = rounded - step;
          break;
        case 'PageUp':
          newPercent = rounded + largeStepPercent;
          break;
        case 'PageDown':
          newPercent = rounded - largeStepPercent;
          break;
        case 'Home':
          newPercent = 0;
          break;
        case 'End':
          newPercent = 100;
          break;
        default:
          // Suppress when any modifier is held to avoid hijacking browser/OS shortcuts.
          if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key >= '0' && event.key <= '9') {
            newPercent = Number(event.key) * 10;
          }
          break;
      }

      if (newPercent !== null) {
        event.preventDefault();
        newPercent = clamp(newPercent, 0, 100);
        state.patch({ pointerPercent: newPercent, dragPercent: newPercent });
        options.onValueChange?.(newPercent);
        options.onValueCommit?.(newPercent);
      }
    },

    onFocus() {
      state.patch({ focused: true });
    },

    onBlur() {
      state.patch({ focused: false });
    },
  };

  listen(abort.signal, 'abort', cleanup, { once: true });

  return {
    interaction: state,
    rootProps,
    thumbProps,
    destroy() {
      abort.abort();
    },
  };
}
