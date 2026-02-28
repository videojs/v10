import { createState, type State } from '@videojs/store';
import { listen } from '@videojs/utils/dom';
import type { PopoverInteraction } from '../../../core/ui/popover/popover-core';
import type { UIFocusEvent, UIPointerEvent } from '../event';

/** What triggered the open state change. */
export type PopoverOpenChangeReason = 'click' | 'hover' | 'focus' | 'escape' | 'outside-click' | 'blur';

/** Detail payload passed to `onOpenChange` callbacks. */
export interface PopoverChangeDetails {
  /** What caused the state change. */
  reason: PopoverOpenChangeReason;
  /** The originating DOM event, when available. */
  event?: Event;
}

/** Configuration for `createPopover()`. Callbacks are read lazily so props stay current. */
export interface PopoverOptions {
  /** Called after the open state changes. */
  onOpenChange: (open: boolean, details: PopoverChangeDetails) => void;
  /** Return current `closeOnEscape` prop value. */
  closeOnEscape: () => boolean;
  /** Return current `closeOnOutsideClick` prop value. */
  closeOnOutsideClick: () => boolean;
  /** Return current `openOnHover` prop value. */
  openOnHover?: () => boolean;
  /** Return current `delay` prop value (ms). */
  delay?: () => number;
  /** Return current `closeDelay` prop value (ms). */
  closeDelay?: () => number;
}

/** Event handlers to spread onto the trigger element. */
export interface PopoverTriggerProps {
  /** Toggle open/close on click. */
  onClick: (event: UIEvent) => void;
  /** Start hover-open delay (when `openOnHover` is enabled). */
  onPointerEnter: (event: UIPointerEvent) => void;
  /** Start hover-close delay (when `openOnHover` is enabled). */
  onPointerLeave: (event: UIPointerEvent) => void;
  /** Open on focus (when `openOnHover` is enabled). */
  onFocusIn: (event: UIFocusEvent) => void;
  /** Close on blur unless focus moved within trigger or popup. */
  onFocusOut: (event: UIFocusEvent) => void;
}

/** Event handlers to spread onto the popup element. */
export interface PopoverPopupProps {
  /** Cancel pending close when pointer enters popup. */
  onPointerEnter: (event: UIPointerEvent) => void;
  /** Start hover-close delay when pointer leaves popup. */
  onPointerLeave: (event: UIPointerEvent) => void;
  /** Close on blur unless focus moved within trigger or popup. */
  onFocusOut: (event: UIFocusEvent) => void;
}

/** Handle returned by `createPopover()` for controlling the popover lifecycle. */
export interface PopoverHandle {
  /** Reactive interaction state. Subscribe to this for UI updates. */
  interaction: State<PopoverInteraction>;
  /** Event handlers to spread onto the trigger element. */
  triggerProps: PopoverTriggerProps;
  /** Event handlers to spread onto the popup element. */
  popupProps: PopoverPopupProps;
  /** The currently registered trigger element. */
  readonly triggerElement: HTMLElement | null;
  /** Register the trigger element for focus/hover tracking and outside-click detection. */
  setTriggerElement: (el: HTMLElement | null) => void;
  /** Register the popup element. Sets `popover="manual"` and manages show/hide. */
  setPopupElement: (el: HTMLElement | null) => void;
  /** Imperatively open the popover. */
  open: (reason?: PopoverOpenChangeReason) => void;
  /** Imperatively close the popover. */
  close: (reason?: PopoverOpenChangeReason) => void;
  /** Tear down all listeners, timers, and state subscriptions. */
  destroy: () => void;
}

export function createPopover(options: PopoverOptions): PopoverHandle {
  const { onOpenChange, closeOnEscape, closeOnOutsideClick } = options;

  const state = createState<PopoverInteraction>({
    open: false,
    transitionStatus: 'closed',
  });

  let triggerEl: HTMLElement | null = null;
  let popupEl: HTMLElement | null = null;
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
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
   * Transition lifecycle:
   * closed → opening → open (on next frame)
   * open → closing → closed (after CSS transitions finish)
   *
   * State is patched first, then `onOpenChange` fires as a notification.
   * This follows the same pattern as `createSlider` — the factory owns
   * its `WritableState` and callers are notified after the fact.
   */
  function applyOpen(reason: PopoverOpenChangeReason, event?: Event): void {
    if (abort.signal.aborted || state.current.open) return;

    state.patch({ open: true, transitionStatus: 'opening' });

    tryShowPopover(popupEl);

    rafId1 = requestAnimationFrame(() => {
      rafId1 = 0;
      if (abort.signal.aborted || !state.current.open) return;
      state.patch({ transitionStatus: 'open' });
    });

    const details: PopoverChangeDetails = event ? { reason, event } : { reason };
    onOpenChange(true, details);
  }

  function applyClose(reason: PopoverOpenChangeReason, event?: Event): void {
    if (abort.signal.aborted || !state.current.open) return;

    state.patch({ transitionStatus: 'closing' });

    // Double-RAF ensures the closing state is painted before we start
    // listening for transitions, avoiding a race where getAnimations()
    // returns nothing because the browser hasn't started them yet.
    rafId1 = requestAnimationFrame(() => {
      rafId1 = 0;
      rafId2 = requestAnimationFrame(() => {
        rafId2 = 0;
        if (abort.signal.aborted) return;
        waitForTransitions(popupEl).finally(() => {
          if (abort.signal.aborted) return;
          if (state.current.transitionStatus !== 'closing') return;
          tryHidePopover(popupEl);
          state.patch({ open: false, transitionStatus: 'closed' });
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
    cancelAnimationFrame(rafId1);
    cancelAnimationFrame(rafId2);
    cleanupDocumentListeners();
    triggerEl = null;
    popupEl = null;
  });

  // --- Trigger props ---

  const triggerProps: PopoverTriggerProps = {
    onClick(event) {
      if (state.current.open) {
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

function waitForTransitions(el: HTMLElement | null): Promise<void> {
  if (!el) return Promise.resolve();

  const transitions = el.getAnimations().filter((anim) => 'transitionProperty' in anim);

  if (transitions.length === 0) return Promise.resolve();

  return Promise.all(transitions.map((t) => t.finished)).then(
    () => {},
    () => {}
  );
}
