import { createState, type State } from '@videojs/store';
import { listen } from '@videojs/utils/dom';
import type { PopoverInteraction } from '../../../core/ui/popover/popover-core';
import type { UIFocusEvent, UIPointerEvent } from '../event';

export type PopoverOpenChangeReason = 'click' | 'hover' | 'focus' | 'escape' | 'outside-click' | 'blur';

export interface PopoverChangeDetails {
  reason: PopoverOpenChangeReason;
  event?: Event;
}

export interface PopoverOptions {
  onOpenChange: (open: boolean, details: PopoverChangeDetails) => void;
  /** Fires after open/close animations complete. */
  onOpenChangeComplete?: (open: boolean) => void;
  closeOnEscape: () => boolean;
  closeOnOutsideClick: () => boolean;
  openOnHover?: () => boolean;
  delay?: () => number;
  closeDelay?: () => number;
}

export interface PopoverTriggerProps {
  onClick: (event: UIEvent) => void;
  onPointerEnter: (event: UIPointerEvent) => void;
  onPointerLeave: (event: UIPointerEvent) => void;
  onFocusIn: (event: UIFocusEvent) => void;
  onFocusOut: (event: UIFocusEvent) => void;
}

export interface PopoverPopupProps {
  onPointerEnter: (event: UIPointerEvent) => void;
  onPointerLeave: (event: UIPointerEvent) => void;
  onFocusOut: (event: UIFocusEvent) => void;
}

export interface PopoverHandle {
  interaction: State<PopoverInteraction>;
  triggerProps: PopoverTriggerProps;
  popupProps: PopoverPopupProps;
  readonly triggerElement: HTMLElement | null;
  setTriggerElement: (el: HTMLElement | null) => void;
  setPopupElement: (el: HTMLElement | null) => void;
  open: (reason?: PopoverOpenChangeReason) => void;
  close: (reason?: PopoverOpenChangeReason) => void;
  destroy: () => void;
}

export function createPopover(options: PopoverOptions): PopoverHandle {
  const { onOpenChange, closeOnEscape, closeOnOutsideClick } = options;

  const state = createState<PopoverInteraction>({ open: false });

  let triggerEl: HTMLElement | null = null;
  let popupEl: HTMLElement | null = null;
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
  let closing = false;
  let rafId1 = 0;
  let rafId2 = 0;

  const abort = new AbortController();
  let docAc: AbortController | null = null;

  // --- Hover management ---

  function clearHoverTimeout(): void {
    if (hoverTimeout !== null) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
  }

  function canHover(): boolean {
    return globalThis.matchMedia?.('(hover: hover)')?.matches ?? false;
  }

  // --- Open/close ---

  /**
   * Animation lifecycle uses CSS data attributes instead of JS state:
   *
   * **Open:** `data-starting-style` is set before `showPopover()` so
   * the browser paints the initial (hidden) state. One RAF later the
   * attribute is removed, triggering the CSS transition to the final
   * (visible) state.
   *
   * **Close:** `data-ending-style` is set to trigger the CSS transition
   * to the hidden state. After a double-RAF (to let the browser start
   * transitions) we wait for `getAnimations()` to settle, then hide
   * the popover and patch `open: false`.
   *
   * `onOpenChange` fires immediately (before animations).
   * `onOpenChangeComplete` fires after animations finish.
   */
  function applyOpen(reason: PopoverOpenChangeReason, event?: Event): void {
    if (abort.signal.aborted) return;

    // If a close animation is in progress, cancel it and re-open.
    // If already open and not closing, bail.
    if (state.current.open && !closing) return;

    // Cancel any in-progress close so the finalizer won't run.
    if (closing) {
      closing = false;
      popupEl?.removeAttribute('data-ending-style');
    }

    // Set data-starting-style BEFORE showing so the browser paints
    // the initial (pre-transition) state.
    popupEl?.setAttribute('data-starting-style', '');

    state.patch({ open: true });
    tryShowPopover(popupEl);

    rafId1 = requestAnimationFrame(() => {
      rafId1 = 0;
      if (abort.signal.aborted || !state.current.open) return;
      // Remove data-starting-style so the element transitions to its
      // natural (open) styles.
      popupEl?.removeAttribute('data-starting-style');
      options.onOpenChangeComplete?.(true);
    });

    const details: PopoverChangeDetails = event ? { reason, event } : { reason };
    onOpenChange(true, details);
  }

  function applyClose(reason: PopoverOpenChangeReason, event?: Event): void {
    if (abort.signal.aborted || !state.current.open || closing) return;

    closing = true;

    // Set data-ending-style to trigger the CSS transition to the
    // hidden state. The element stays in the DOM (open: true) so
    // the exit animation is visible.
    popupEl?.setAttribute('data-ending-style', '');

    // Double-RAF ensures the browser has started CSS transitions
    // before we query getAnimations().
    rafId1 = requestAnimationFrame(() => {
      rafId1 = 0;
      rafId2 = requestAnimationFrame(() => {
        rafId2 = 0;
        if (abort.signal.aborted) return;
        waitForAnimations(popupEl).finally(() => {
          if (abort.signal.aborted || !closing) return;
          closing = false;
          popupEl?.removeAttribute('data-ending-style');
          tryHidePopover(popupEl);
          state.patch({ open: false });
          options.onOpenChangeComplete?.(false);
        });
      });
    });

    const details: PopoverChangeDetails = event ? { reason, event } : { reason };
    onOpenChange(false, details);
  }

  // --- Imperative API ---

  function open(reason: PopoverOpenChangeReason = 'click'): void {
    applyOpen(reason);
  }

  function close(reason: PopoverOpenChangeReason = 'click'): void {
    applyClose(reason);
  }

  // --- Document-level listeners (scoped to open state) ---

  function setupDocumentListeners(): void {
    cleanupDocumentListeners();

    if (typeof document === 'undefined') return;

    docAc = new AbortController();
    const signal = docAc.signal;

    listen(document, 'keydown', handleDocumentKeydown, { signal });
    listen(document, 'pointerdown', handleDocumentPointerdown, { capture: true, signal });
  }

  function cleanupDocumentListeners(): void {
    docAc?.abort();
    docAc = null;
  }

  function handleDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && closeOnEscape() && state.current.open) {
      event.preventDefault();
      applyClose('escape', event);
    }
  }

  function handleDocumentPointerdown(event: PointerEvent): void {
    if (!closeOnOutsideClick() || !state.current.open) return;

    const target = event.target as Node | null;
    if (!target) return;

    if (triggerEl?.contains(target) || popupEl?.contains(target)) return;

    applyClose('outside-click', event);
  }

  // Subscribe to open state to manage document listeners.
  const unsubscribe = state.subscribe(() => {
    if (state.current.open) {
      setupDocumentListeners();
    } else {
      cleanupDocumentListeners();
    }
  });

  // Centralize cleanup on abort so any call to abort.abort() is sufficient.
  abort.signal.addEventListener('abort', () => {
    unsubscribe();
    clearHoverTimeout();
    closing = false;
    cancelAnimationFrame(rafId1);
    cancelAnimationFrame(rafId2);
    cleanupDocumentListeners();
    triggerEl = null;
    popupEl = null;
  });

  // --- Trigger props ---

  const triggerProps: PopoverTriggerProps = {
    onClick(event) {
      // During a close animation (open=true, closing=true), treat
      // the click as a re-open rather than a second close attempt.
      if (state.current.open && !closing) {
        applyClose('click', event);
      } else {
        applyOpen('click', event);
      }
    },

    onPointerEnter(_event) {
      if (!options.openOnHover?.()) return;
      if (!canHover()) return;

      clearHoverTimeout();

      if (state.current.open) return;

      const delay = options.delay?.() ?? 300;
      hoverTimeout = setTimeout(() => applyOpen('hover'), delay);
    },

    onPointerLeave(_event) {
      if (!options.openOnHover?.()) return;
      if (!canHover()) return;

      clearHoverTimeout();

      if (!state.current.open) return;

      const closeDelay = options.closeDelay?.() ?? 0;
      hoverTimeout = setTimeout(() => applyClose('hover'), closeDelay);
    },

    onFocusIn(_event) {
      if (options.openOnHover?.()) {
        applyOpen('focus');
      }
    },

    onFocusOut(event) {
      const relatedTarget = event.relatedTarget as Node | null;

      // Don't close if focus moved within trigger or popup
      if (relatedTarget && (triggerEl?.contains(relatedTarget) || popupEl?.contains(relatedTarget))) {
        return;
      }

      if (options.openOnHover?.()) {
        applyClose('blur');
      }
    },
  };

  // --- Popup props ---

  const popupProps: PopoverPopupProps = {
    onPointerEnter(_event) {
      if (!options.openOnHover?.()) return;
      // Cancel any pending close when pointer enters popup
      clearHoverTimeout();
    },

    onPointerLeave(_event) {
      if (!options.openOnHover?.()) return;

      clearHoverTimeout();

      if (!state.current.open) return;

      const closeDelay = options.closeDelay?.() ?? 0;
      hoverTimeout = setTimeout(() => applyClose('hover'), closeDelay);
    },

    onFocusOut(event) {
      const relatedTarget = event.relatedTarget as Node | null;

      if (relatedTarget && (triggerEl?.contains(relatedTarget) || popupEl?.contains(relatedTarget))) {
        return;
      }

      applyClose('blur');
    },
  };

  // --- Element setters ---

  function setTriggerElement(el: HTMLElement | null): void {
    triggerEl = el;
  }

  function setPopupElement(el: HTMLElement | null): void {
    // Hide the old element before clearing the reference so it
    // doesn't remain visually shown via the Popover API.
    if (!el && popupEl && state.current.open) {
      tryHidePopover(popupEl);
    }

    popupEl = el;

    if (el) {
      el.setAttribute('popover', 'manual');

      // If the interaction is already open (e.g., React mount after state
      // change), show the popover now. In `applyOpen` the element may not
      // have been in the DOM yet, so the earlier `tryShowPopover` was a no-op.
      if (state.current.open) {
        tryShowPopover(el);
      }
    }
  }

  // --- Cleanup ---

  function destroy(): void {
    if (abort.signal.aborted) return;
    abort.abort();
  }

  return {
    interaction: state,
    triggerProps,
    popupProps,
    get triggerElement() {
      return triggerEl;
    },
    setTriggerElement,
    setPopupElement,
    open,
    close,
    destroy,
  };
}

// --- Popover API helpers ---

function tryShowPopover(el: HTMLElement | null): void {
  try {
    el?.showPopover?.();
  } catch {
    // Element may not support popover API
  }
}

function tryHidePopover(el: HTMLElement | null): void {
  try {
    el?.hidePopover?.();
  } catch {
    // Element may not support popover API or may already be hidden
  }
}

function waitForAnimations(el: HTMLElement | null): Promise<void> {
  if (!el) return Promise.resolve();

  const animations = el.getAnimations();

  if (animations.length === 0) return Promise.resolve();

  return Promise.all(animations.map((a) => a.finished)).then(
    () => {},
    () => {}
  );
}
