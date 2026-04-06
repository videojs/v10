import { createState, type State } from '@videojs/store';
import { throttle } from '@videojs/utils/function';
import { clamp, roundToStep } from '@videojs/utils/number';
import { isNull } from '@videojs/utils/predicate';
import type { SliderInput, SliderState } from '../../core/ui/slider/slider-core';
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
   * Leading+trailing throttle (ms) for `onValueChange` during drag. When
   * `> 0`, `onValueChange` fires immediately on the first drag move (leading
   * edge), then at most once per window during subsequent moves. `0` (default)
   * disables throttling — `onValueChange` fires on every pointermove.
   */
  changeThrottle?: number | undefined;
  /** Adjust a raw 0–100 percent for thumb alignment. Enables `adjustForAlignment()`. */
  adjustPercent?: ((rawPercent: number, thumbSize: number, trackSize: number) => number) | undefined;
  /** Fires continuously as the value changes (every pointermove during drag, keyboard steps). */
  onValueChange?: ((percent: number) => void) | undefined;
  /** Fires once when the user commits the value (pointer release, keyboard step). */
  onValueCommit?: ((percent: number) => void) | undefined;
  onDragStart?: (() => void) | undefined;
  onDragEnd?: (() => void) | undefined;
  /** Called when the root element resizes (e.g. gains layout inside a popover). */
  onResize?: (() => void) | undefined;
}

export interface SliderRootProps {
  onPointerDown: (event: UIPointerEvent) => void;
  onPointerMove: (event: UIPointerEvent) => void;
  onPointerUp: (event: UIPointerEvent) => void;
  onPointerLeave: (event: UIPointerEvent) => void;
  onLostPointerCapture: () => void;
}

export interface SliderRootStyle extends Record<string, string> {
  touchAction: string;
  userSelect: string;
}

export interface SliderThumbProps {
  onKeyDown: (event: UIKeyboardEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export interface SliderApi {
  input: State<SliderInput>;
  rootProps: SliderRootProps;
  rootStyle: SliderRootStyle;
  thumbProps: SliderThumbProps;
  /**
   * Adjust `fillPercent` and `pointerPercent` for edge thumb alignment using
   * live DOM measurements from the root/thumb elements. No-op when
   * `adjustPercent` was not provided or `thumbAlignment` is not `'edge'`.
   */
  adjustForAlignment: <S extends SliderState>(state: S) => S;
  destroy: () => void;
}

/** Intentional drag threshold — number of pointermove events before drag starts. */
const DRAG_THRESHOLD = 2;

export function createSlider(options: SliderOptions): SliderApi {
  const input = createState<SliderInput>({
    pointerPercent: 0,
    dragPercent: 0,
    dragging: false,
    pointing: false,
    focused: false,
  });

  const abort = new AbortController();
  const changeThrottleMs = options.changeThrottle ?? 0;

  let isDragging = false,
    moveCount = 0,
    cachedRTL = false,
    cachedRect: DOMRect | null = null,
    capturedPointerId: number | null = null,
    lastDragPercent = 0,
    committedOnRelease = false;

  const throttledChange =
    changeThrottleMs > 0
      ? throttle((percent: number) => options.onValueChange?.(percent), changeThrottleMs, { leading: true })
      : null;

  /** Fire `onValueChange` — throttled during drag when `changeThrottle > 0`. */
  function fireChange(percent: number, duringDrag: boolean): void {
    if (duringDrag && throttledChange) {
      throttledChange(percent);
    } else {
      options.onValueChange?.(percent);
    }
  }

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
      input.patch({ pointing: false });
    } else {
      // Fire a final commit if pointerup didn't already handle it.
      if (!committedOnRelease) {
        options.onValueCommit?.(lastDragPercent);
      }

      isDragging = false;
      input.patch({ dragging: false, pointing: false });
      options.onDragEnd?.();
    }

    committedOnRelease = false;
    cleanup();
  }

  function cleanup() {
    throttledChange?.cancel();
    capturedPointerId = null;
    cachedRect = null;
  }

  // --- Root props ---
  const rootProps: SliderRootProps = {
    onPointerDown(event) {
      if (options.isDisabled()) return;

      // Prevent the browser's default mousedown focus behavior. Without this,
      // clicking a non-focusable child (e.g. the track) causes the browser to
      // move focus away from the thumb after our programmatic `focus()` call,
      // which can trigger unrelated `focusout` handlers (e.g. popover close).
      event.preventDefault();

      const el = options.getElement();

      cachedRect = el.getBoundingClientRect();
      cachedRTL = options.isRTL();
      moveCount = 0;
      committedOnRelease = false;

      releaseCapture();
      capturedPointerId = event.pointerId;
      el.setPointerCapture(event.pointerId);

      const percent = getPercentFromPointerEvent(event, cachedRect, options.getOrientation(), cachedRTL);

      lastDragPercent = percent;
      input.patch({ pointing: true, pointerPercent: percent, dragPercent: percent });
      options.onValueChange?.(percent);

      // Focus the thumb for keyboard follow-up and screen reader tracking.
      options.getThumbElement?.()?.focus({
        preventScroll: true,
        focusVisible: false,
      });
    },

    onPointerMove(event) {
      if (options.isDisabled()) return;

      // Pointer is captured — this is a drag-related move.
      if (!isNull(capturedPointerId)) {
        // Stale drag safety: if buttons === 0 for non-touch, browser lost the pointerup.
        if (event.pointerType !== 'touch' && event.buttons === 0) {
          endDrag();
          return;
        }

        moveCount++;

        const percent = getPercentFromPointerEvent(event, cachedRect!, options.getOrientation(), cachedRTL);

        if (!isDragging && moveCount >= DRAG_THRESHOLD) {
          isDragging = true;
          lastDragPercent = percent;
          input.patch({ dragging: true, dragPercent: percent, pointerPercent: percent });
          options.onDragStart?.();
          fireChange(percent, true);
        } else if (isDragging) {
          lastDragPercent = percent;
          input.patch({ dragPercent: percent, pointerPercent: percent });
          fireChange(percent, true);
        } else {
          // Below drag threshold — update hover preview only.
          input.patch({ pointerPercent: percent });
        }

        return;
      }

      // No capture — hover preview.
      const el = options.getElement();
      const rect = el.getBoundingClientRect();
      const percent = getPercentFromPointerEvent(event, rect, options.getOrientation(), options.isRTL());

      input.patch({ pointing: true, pointerPercent: percent });
    },

    onPointerUp(event) {
      if (isNull(capturedPointerId)) return;

      const percent = getPercentFromPointerEvent(event, cachedRect!, options.getOrientation(), cachedRTL);

      // Cancel any pending throttled change before the final unthrottled pair.
      throttledChange?.cancel();
      options.onValueChange?.(percent);
      options.onValueCommit?.(percent);
      committedOnRelease = true;
    },

    onPointerLeave() {
      if (!isNull(capturedPointerId)) return;
      input.patch({ pointing: false });
    },

    onLostPointerCapture() {
      endDrag();
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
        input.patch({ pointerPercent: newPercent, dragPercent: newPercent });
        options.onValueChange?.(newPercent);
        options.onValueCommit?.(newPercent);
      }
    },

    onFocus() {
      input.patch({ focused: true });
    },

    onBlur() {
      input.patch({ focused: false });
    },
  };

  function adjustForAlignment<S extends SliderState>(state: S): S {
    if (!options.adjustPercent || state.thumbAlignment !== 'edge') return state;

    const rootEl = options.getElement();
    const thumbEl = options.getThumbElement?.();
    if (!thumbEl) return state;

    const isHorizontal = state.orientation === 'horizontal';
    const thumbSize = isHorizontal ? thumbEl.offsetWidth : thumbEl.offsetHeight;
    const trackSize = isHorizontal ? rootEl.offsetWidth : rootEl.offsetHeight;

    return {
      ...state,
      fillPercent: options.adjustPercent(state.fillPercent, thumbSize, trackSize),
      pointerPercent: options.adjustPercent(state.pointerPercent, thumbSize, trackSize),
    };
  }

  let resizeObserver: ResizeObserver | null = null;

  if (options.onResize) {
    resizeObserver = new ResizeObserver(() => options.onResize!());
    resizeObserver.observe(options.getElement());
  }

  const rootStyle: SliderRootStyle = { touchAction: 'none', userSelect: 'none' };

  return {
    input,
    rootProps,
    rootStyle,
    thumbProps,
    adjustForAlignment,
    destroy() {
      if (abort.signal.aborted) return;
      abort.abort();
      resizeObserver?.disconnect();
      releaseCapture();
      cleanup();
    },
  };
}
