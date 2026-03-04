import type { State } from '@videojs/store';
import { listen } from '@videojs/utils/dom';
import type { PopoverInput } from '../../../core/ui/popover/popover-core';
import type { UIFocusEvent, UIPointerEvent } from '../event';
import type { TransitionApi } from '../transition';

export type PopoverOpenChangeReason = 'click' | 'hover' | 'focus' | 'escape' | 'outside-click' | 'blur';

export interface PopoverChangeDetails {
  reason: PopoverOpenChangeReason;
  event?: Event;
}

export interface PopoverOptions {
  transition: TransitionApi;
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

export interface PopoverApi {
  input: State<PopoverInput>;
  triggerProps: PopoverTriggerProps;
  popupProps: PopoverPopupProps;
  readonly triggerElement: HTMLElement | null;
  setTriggerElement: (el: HTMLElement | null) => void;
  setPopupElement: (el: HTMLElement | null) => void;
  open: (reason?: PopoverOpenChangeReason) => void;
  close: (reason?: PopoverOpenChangeReason) => void;
  destroy: () => void;
}

export function createPopover(options: PopoverOptions): PopoverApi {
  const { transition, onOpenChange, closeOnEscape, closeOnOutsideClick } = options;

  const state = transition.state;

  let triggerEl: HTMLElement | null = null;
  let popupEl: HTMLElement | null = null;
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

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
   * The transition handler manages animation lifecycle via `createState`:
   *
   * **Open:** `transition.open()` patches `{ active: true, status: 'starting' }`.
   * After one RAF it patches `{ status: 'idle' }` and the promise resolves.
   * Frameworks render `data-starting-style` / `data-ending-style` via
   * `getPopupAttrs(state)` — no imperative DOM mutation needed.
   *
   * **Close:** `transition.close(el)` patches `{ status: 'ending' }` (keeping
   * `active: true` so the element stays mounted). After a double-RAF it waits
   * for `getAnimations()` to settle, then patches `{ active: false, status: 'idle' }`.
   *
   * `onOpenChange` fires immediately (before animations).
   * `onOpenChangeComplete` fires after animations finish.
   */
  function applyOpen(reason: PopoverOpenChangeReason, event?: Event): void {
    if (abort.signal.aborted) return;

    const { active, status } = state.current;

    // If a close animation is in progress, cancel it and re-open.
    // If already active and not closing, bail.
    if (active && status !== 'ending') return;

    if (status === 'ending') {
      transition.cancel();
    }

    transition.open().then(() => {
      if (abort.signal.aborted || !state.current.active) return;
      options.onOpenChangeComplete?.(true);
    });

    tryShowPopover(popupEl);

    const details: PopoverChangeDetails = event ? { reason, event } : { reason };
    onOpenChange(true, details);
  }

  function applyClose(reason: PopoverOpenChangeReason, event?: Event): void {
    const { active, status } = state.current;
    if (abort.signal.aborted || !active || status === 'ending') return;

    transition.close(popupEl).then(() => {
      if (abort.signal.aborted) return;
      tryHidePopover(popupEl);
      options.onOpenChangeComplete?.(false);
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
    if (event.key === 'Escape' && closeOnEscape() && state.current.active) {
      event.preventDefault();
      applyClose('escape', event);
    }
  }

  function handleDocumentPointerdown(event: PointerEvent): void {
    if (!closeOnOutsideClick() || !state.current.active) return;

    const target = event.target as Node | null;
    if (!target) return;

    if (triggerEl?.contains(target) || popupEl?.contains(target)) return;

    applyClose('outside-click', event);
  }

  // Subscribe to open state to manage document listeners.
  const unsubscribe = state.subscribe(() => {
    if (state.current.active) {
      setupDocumentListeners();
    } else {
      cleanupDocumentListeners();
    }
  });

  // Centralize cleanup on abort so any call to abort.abort() is sufficient.
  abort.signal.addEventListener('abort', () => {
    unsubscribe();
    clearHoverTimeout();
    transition.destroy();
    cleanupDocumentListeners();
    triggerEl = null;
    popupEl = null;
  });

  // --- Trigger props ---

  const triggerProps: PopoverTriggerProps = {
    onClick(event) {
      // During a close animation (open=true, status=ending), treat
      // the click as a re-open rather than a second close attempt.
      if (state.current.active && state.current.status !== 'ending') {
        applyClose('click', event);
      } else {
        applyOpen('click', event);
      }
    },

    onPointerEnter(_event) {
      if (!options.openOnHover?.()) return;
      if (!canHover()) return;

      clearHoverTimeout();

      if (state.current.active) return;

      const delay = options.delay?.() ?? 300;
      hoverTimeout = setTimeout(() => applyOpen('hover'), delay);
    },

    onPointerLeave(_event) {
      if (!options.openOnHover?.()) return;
      if (!canHover()) return;

      clearHoverTimeout();

      if (!state.current.active) return;

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

      if (!state.current.active) return;

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
    if (!el && popupEl && state.current.active) {
      tryHidePopover(popupEl);
    }

    popupEl = el;

    if (el) {
      // If the interaction is already open (e.g., React mount after state
      // change), show the popover now. In `applyOpen` the element may not
      // have been in the DOM yet, so the earlier `tryShowPopover` was a no-op.
      if (state.current.active) {
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
    input: state,
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
