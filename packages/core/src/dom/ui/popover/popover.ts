import type { State } from '@videojs/store';
import { listen, tryHidePopover, tryShowPopover } from '@videojs/utils/dom';
import type { PopoverInput } from '../../../core/ui/popover/popover-core';
import { createDismissLayer } from '../dismiss-layer';
import type { UIFocusEvent, UIPointerEvent } from '../event';
import type { TransitionApi } from '../transition';
import type { PopupGroup } from './popup-group';

/** Reason an open/close transition was triggered on a popover. */
export type PopoverOpenChangeReason =
  | 'click'
  | 'hover'
  | 'focus'
  | 'escape'
  | 'outside-click'
  | 'blur'
  | 'imperative-action'
  | 'group-open';

/** Details accompanying a popover open/close change. */
export interface PopoverChangeDetails {
  /** Why the change happened. */
  reason: PopoverOpenChangeReason;
  /** Originating DOM event, when applicable. */
  event?: Event;
}

/** Options for {@link createPopover}. */
export interface PopoverOptions {
  /** Transition controller driving open/close animations. */
  transition: TransitionApi;
  /** Called when the popover's open state changes. */
  onOpenChange: (open: boolean, details: PopoverChangeDetails) => void;
  /** Fires after open/close animations complete. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** Predicate returning whether Escape should close the popover. */
  closeOnEscape: () => boolean;
  /** Predicate returning whether outside clicks should close the popover. */
  closeOnOutsideClick: () => boolean;
  /** Predicate returning whether to open on hover. */
  openOnHover?: () => boolean;
  /** Hover open delay in ms. */
  delay?: () => number;
  /** Hover close delay in ms. */
  closeDelay?: () => number;
  /** Optional shared popup group for at-most-one-open behavior. */
  group?: () => PopupGroup | undefined;
}

/** Event-handler bundle for the popover trigger element. */
export interface PopoverTriggerProps {
  /** Toggle the popover on click. */
  onClick: (event: UIEvent) => void;
  /** Hover-open handler. */
  onPointerEnter: (event: UIPointerEvent) => void;
  /** Hover-close handler. */
  onPointerLeave: (event: UIPointerEvent) => void;
  /** Focus-open handler. */
  onFocusIn: (event: UIFocusEvent) => void;
  /** Focus-close handler. */
  onFocusOut: (event: UIFocusEvent) => void;
}

/** Event-handler bundle for the popover popup element. */
export interface PopoverPopupProps {
  /** Cancels any pending hover-close when the pointer enters the popup. */
  onPointerEnter: (event: UIPointerEvent) => void;
  /** Schedules a hover-close when the pointer leaves the popup. */
  onPointerLeave: (event: UIPointerEvent) => void;
  /** Tracks pointer captures inside the popup to avoid spurious closes. */
  onGotPointerCapture: (event: UIPointerEvent) => void;
  /** Mirrors `onGotPointerCapture` for capture release. */
  onLostPointerCapture: (event: UIPointerEvent) => void;
  /** Close on focus leaving both trigger and popup subtrees. */
  onFocusOut: (event: UIFocusEvent) => void;
}

/** Imperative handle returned by {@link createPopover}. */
export interface PopoverApi {
  /** Reactive transition state for downstream cores. */
  input: State<PopoverInput>;
  /** Props for the trigger element. */
  triggerProps: PopoverTriggerProps;
  /** Props for the popup element. */
  popupProps: PopoverPopupProps;
  /** Currently registered trigger element, if any. */
  readonly triggerElement: HTMLElement | null;
  /** Register the trigger element. */
  setTriggerElement: (el: HTMLElement | null) => void;
  /** Register the popup element. */
  setPopupElement: (el: HTMLElement | null) => void;
  /** Open the popover. */
  open: (reason?: PopoverOpenChangeReason) => void;
  /** Close the popover. */
  close: (reason?: PopoverOpenChangeReason) => void;
  /** Tear down the popover controller. */
  destroy: () => void;
}

/**
 * Build a popover controller — toggle, hover/focus open, outside-click dismiss, and group membership.
 *
 * @param options - Popover configuration.
 */
export function createPopover(options: PopoverOptions): PopoverApi {
  const { onOpenChange, closeOnOutsideClick } = options;

  let triggerEl: HTMLElement | null = null;
  let popupEl: HTMLElement | null = null;
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
  const capturedPointers = new Set<number>();

  const layer = createDismissLayer({
    transition: options.transition,
    closeOnEscape: options.closeOnEscape,
    onEscapeDismiss(event) {
      event.preventDefault();
      applyClose('escape', event);
    },
    onDocumentActive(signal) {
      listen(document, 'pointerdown', handleDocumentPointerdown, { capture: true, signal });
    },
  });

  const state = layer.input;
  const groupMember = {
    close(reason: 'group-open') {
      applyClose(reason);
    },
  };

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

  function canOpenOnFocus(): boolean {
    if (!canHover()) return false;
    return globalThis.matchMedia?.('(pointer: fine)')?.matches ?? false;
  }

  function canToggleOnClick(): boolean {
    if (!options.openOnHover?.()) return true;
    return canHover();
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
    const opening = layer.open();
    if (!opening) return;

    options.group?.()?.open(groupMember);

    const details: PopoverChangeDetails = event ? { reason, event } : { reason };
    onOpenChange(true, details);

    opening.then(() => {
      if (layer.signal.aborted || !state.current.active) return;
      options.onOpenChangeComplete?.(true);
    });
  }

  function applyClose(reason: PopoverOpenChangeReason, event?: Event): void {
    const closing = layer.close(popupEl);
    if (!closing) return;

    options.group?.()?.close(groupMember);

    const details: PopoverChangeDetails = event ? { reason, event } : { reason };
    onOpenChange(false, details);

    closing.then(() => {
      if (layer.signal.aborted) return;
      tryHidePopover(popupEl);
      options.onOpenChangeComplete?.(false);
    });
  }

  // --- Imperative API ---

  function open(reason: PopoverOpenChangeReason = 'click'): void {
    applyOpen(reason);
  }

  function close(reason: PopoverOpenChangeReason = 'click'): void {
    applyClose(reason);
  }

  // --- Outside-click handler ---

  function handleDocumentPointerdown(event: PointerEvent): void {
    if (!closeOnOutsideClick() || !state.current.active) return;

    // Use composedPath so the check works when the popup lives inside a
    // Shadow DOM tree. event.target is retargeted to the shadow host when
    // the listener is on document, so contains() would always fail.
    const path = event.composedPath();

    if ((triggerEl && path.includes(triggerEl)) || (popupEl && path.includes(popupEl))) return;

    applyClose('outside-click', event);
  }

  // Cleanup hover timeout on destroy.
  layer.signal.addEventListener('abort', () => {
    options.group?.()?.close(groupMember);
    clearHoverTimeout();
    capturedPointers.clear();
    triggerEl = null;
    popupEl = null;
  });

  // --- Trigger props ---

  const triggerProps: PopoverTriggerProps = {
    onClick(event) {
      if (!canToggleOnClick()) return;

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
        if (!canOpenOnFocus()) return;
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

      // A descendant has pointer capture (e.g. slider drag). The leave is
      // synthetic — the pointer hasn't actually left — so don't close.
      if (capturedPointers.size > 0) return;

      clearHoverTimeout();

      if (!state.current.active) return;

      const closeDelay = options.closeDelay?.() ?? 0;
      hoverTimeout = setTimeout(() => applyClose('hover'), closeDelay);
    },

    onGotPointerCapture(event) {
      capturedPointers.add(event.pointerId);
    },

    onLostPointerCapture(event) {
      capturedPointers.delete(event.pointerId);
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
      // If the popover is already open (e.g., React mount after state
      // change), show the popover now. In `applyOpen` the element may not
      // have been in the DOM yet, so the earlier `tryShowPopover` was a no-op.
      if (state.current.active) {
        tryShowPopover(el);
      }
    }
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
    destroy: layer.destroy,
  };
}
