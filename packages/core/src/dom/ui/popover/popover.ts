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
  onFocusOut: (event: UIFocusEvent) => void;
}

export interface Popover {
  interaction: State<PopoverInteraction>;
  triggerProps: PopoverTriggerProps;
  popupProps: PopoverPopupProps;
  setTriggerElement: (el: HTMLElement | null) => void;
  setPopupElement: (el: HTMLElement | null) => void;
  setBoundaryElement: (el: HTMLElement | null) => void;
  open: (reason?: PopoverOpenChangeReason) => void;
  close: (reason?: PopoverOpenChangeReason) => void;
  destroy: () => void;
}

export function createPopover(options: PopoverOptions): Popover {
  const { onOpenChange, closeOnEscape, closeOnOutsideClick } = options;

  const state = createState<PopoverInteraction>({
    open: false,
    transitionStatus: 'closed',
  });

  let triggerEl: HTMLElement | null = null;
  let popupEl: HTMLElement | null = null;
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  const cleanups: (() => void)[] = [];

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
    if (destroyed || state.current.open) return;

    state.patch({ open: true, transitionStatus: 'opening' });

    tryShowPopover(popupEl);

    requestAnimationFrame(() => {
      if (!state.current.open) return;
      state.patch({ transitionStatus: 'open' });
    });

    const details: PopoverChangeDetails = event ? { reason, event } : { reason };
    onOpenChange(true, details);
  }

  function applyClose(reason: PopoverOpenChangeReason, event?: Event): void {
    if (destroyed || !state.current.open) return;

    state.patch({ transitionStatus: 'closing' });

    requestAnimationFrame(() => {
      waitForTransitions(popupEl).finally(() => {
        if (state.current.transitionStatus !== 'closing') return;
        tryHidePopover(popupEl);
        state.patch({ open: false, transitionStatus: 'closed' });
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

    cleanups.push(
      listen(document, 'keydown', handleDocumentKeydown),
      listen(document, 'pointerdown', handleDocumentPointerdown, { capture: true })
    );
  }

  function cleanupDocumentListeners(): void {
    for (const cleanup of cleanups.splice(0)) cleanup();
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

  // Subscribe to open state to manage document listeners
  state.subscribe(() => {
    if (state.current.open) {
      setupDocumentListeners();
    } else {
      cleanupDocumentListeners();
    }
  });

  // --- Trigger props ---

  const triggerProps: PopoverTriggerProps = {
    onClick(event) {
      if (state.current.open) {
        applyClose('click', event as unknown as Event);
      } else {
        applyOpen('click', event as unknown as Event);
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

      clearHoverTimeout();

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
    popupEl = el;

    if (el) {
      el.setAttribute('popover', 'manual');
    }
  }

  function setBoundaryElement(_el: HTMLElement | null): void {
    // Reserved for future positioning constraint logic.
  }

  // --- Cleanup ---

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    clearHoverTimeout();
    cleanupDocumentListeners();
    triggerEl = null;
    popupEl = null;
  }

  return {
    interaction: state,
    triggerProps,
    popupProps,
    setTriggerElement,
    setPopupElement,
    setBoundaryElement,
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

  const transitions = el.getAnimations().filter((anim) => anim instanceof CSSTransition);

  if (transitions.length === 0) return Promise.resolve();

  return Promise.all(transitions.map((t) => t.finished)).then(
    () => {},
    () => {}
  );
}
