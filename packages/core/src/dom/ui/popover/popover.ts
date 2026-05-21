import type { State } from '@videojs/store';
import { listen, tryHidePopover, tryShowPopover } from '@videojs/utils/dom';
import type { PopoverInput } from '../../../core/ui/popover/popover-core';
import { createDismissLayer } from '../dismiss-layer';
import type { UIFocusEvent, UIPointerEvent } from '../event';
import type { TransitionApi } from '../transition';
import type { PopupGroup } from './popup-group';

export type PopoverOpenChangeReason =
  | 'click'
  | 'hover'
  | 'focus'
  | 'escape'
  | 'outside-click'
  | 'blur'
  | 'imperative-action'
  | 'group-open';

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
  group?: () => PopupGroup | undefined;
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
  onGotPointerCapture: (event: UIPointerEvent) => void;
  onLostPointerCapture: (event: UIPointerEvent) => void;
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
  const { onOpenChange, closeOnOutsideClick } = options;

  let triggerEl: HTMLElement | null = null;
  let popupEl: HTMLElement | null = null;
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
  let unregisterMemberTrigger: (() => void) | null = null;
  const capturedPointers = new Set<number>();
  let skipBlurCloseAfterInsidePointer = false;
  let skipBlurCloseTimeout: ReturnType<typeof setTimeout> | null = null;
  /** Settled when the current close animation finishes (see `applyClose`). */
  let closeAnimationPromise: Promise<void> | null = null;
  /** True while a trigger click during `ending` has scheduled `applyOpen` after close settles. */
  let reopenAfterClosePending = false;

  const layer = createDismissLayer({
    transition: options.transition,
    closeOnEscape: options.closeOnEscape,
    onEscapeDismiss(event) {
      event.preventDefault();
      applyClose('escape', event);
    },
    onDocumentActive(signal) {
      listen(document, 'pointerdown', handleDocumentPointerdown, {
        capture: true,
        signal,
      });
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

  function clearInsidePointerBlurCloseGuard(): void {
    skipBlurCloseAfterInsidePointer = false;
    if (skipBlurCloseTimeout !== null) {
      clearTimeout(skipBlurCloseTimeout);
      skipBlurCloseTimeout = null;
    }
  }

  function skipNextBlurCloseAfterInsidePointer(): void {
    // Some browsers retarget focus to the shadow host/body between pointerdown
    // and click. Keep this armed through the gesture so inside menu actions can
    // decide whether the popup closes.
    skipBlurCloseAfterInsidePointer = true;
    if (skipBlurCloseTimeout !== null) clearTimeout(skipBlurCloseTimeout);
    skipBlurCloseTimeout = setTimeout(clearInsidePointerBlurCloseGuard, 500);
  }

  function shouldSkipBlurCloseAfterInsidePointer(): boolean {
    if (!skipBlurCloseAfterInsidePointer) return false;

    clearInsidePointerBlurCloseGuard();
    return true;
  }

  // --- Open/close ---

  /**
   * The transition handler manages animation lifecycle via `createState`:
   *
   * **Open:** `transition.open()` patches `{ active: true, status: 'starting', transitioning: true }`.
   * After one RAF it patches `{ status: 'idle' }`; the promise resolves when animations settle.
   * Frameworks render `data-starting-style` / `data-ending-style` via
   * `getPopupAttrs(state)` — no imperative DOM mutation needed.
   *
   * **Close:** `transition.close(el)` patches `{ status: 'ending', transitioning: true }` (keeping
   * `active: true` so the element stays mounted). After a double-RAF it waits
   * for `getAnimations({ subtree: true })` to settle, then patches `{ active: false, status: 'idle' }`.
   *
   * `onOpenChange` fires immediately (before animations).
   * `onOpenChangeComplete` fires after animations finish.
   */
  function applyOpen(reason: PopoverOpenChangeReason, event?: Event): void {
    const opening = layer.open(popupEl);
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

    closeAnimationPromise = closing.finally(() => {
      closeAnimationPromise = null;
    });

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

    if ((triggerEl && path.includes(triggerEl)) || (popupEl && path.includes(popupEl))) {
      skipNextBlurCloseAfterInsidePointer();
      return;
    }

    clearInsidePointerBlurCloseGuard();

    if (options.group?.()?.pathHasPeerMemberTrigger(path, triggerEl)) return;

    applyClose('outside-click', event);
  }

  // Cleanup hover timeout on destroy.
  layer.signal.addEventListener('abort', () => {
    options.group?.()?.close(groupMember);
    unregisterMemberTrigger?.();
    unregisterMemberTrigger = null;
    clearHoverTimeout();
    clearInsidePointerBlurCloseGuard();
    capturedPointers.clear();
    triggerEl = null;
    popupEl = null;
  });

  // --- Trigger props ---

  const triggerProps: PopoverTriggerProps = {
    onClick(event) {
      if (!canToggleOnClick()) return;

      event.preventDefault();

      const { active, status } = state.current;

      if (!active) {
        applyOpen('click', event);
        return;
      }

      // During the close animation `layer.close()` is a no-op. Canceling the close via
      // `transition.cancel()` + immediate `open()` leaves transitions half-applied (Safari)
      // and conflicts with menu triggers that share this handler. Defer reopen until the
      // in-flight close settles so rapid double-clicks still toggle reliably.
      if (status === 'ending') {
        const pending = closeAnimationPromise;
        if (!pending || reopenAfterClosePending) return;

        reopenAfterClosePending = true;
        pending
          .then(() => {
            if (layer.signal.aborted) return;
            if (!state.current.active) {
              applyOpen('click', event);
            }
          })
          .finally(() => {
            reopenAfterClosePending = false;
          });
        return;
      }

      applyClose('click', event);
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

      if (relatedTarget instanceof HTMLElement && options.group?.()?.isPeerTrigger?.(relatedTarget, triggerEl)) {
        return;
      }

      if (shouldSkipBlurCloseAfterInsidePointer()) return;

      if (relatedTarget !== null) {
        if (!state.current.active || state.current.status === 'ending') return;
        applyClose('blur');
        return;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!state.current.active || state.current.status === 'ending' || state.current.status === 'starting') {
            return;
          }

          const active = typeof document !== 'undefined' ? document.activeElement : null;
          if (active && (triggerEl?.contains(active) || popupEl?.contains(active))) {
            return;
          }

          applyClose('blur');
        });
      });
    },
  };

  // --- Element setters ---

  function setTriggerElement(el: HTMLElement | null): void {
    unregisterMemberTrigger?.();
    unregisterMemberTrigger = null;
    triggerEl = el;
    const group = options.group?.();
    if (el && group) {
      unregisterMemberTrigger = group.addMemberTrigger(el);
    }
  }

  function setPopupElement(el: HTMLElement | null): void {
    // Hide the old element before clearing the reference so it
    // doesn't remain visually shown via the Popover API.
    if (!el && popupEl && state.current.active) {
      tryHidePopover(popupEl);
    }

    popupEl = el;
    options.transition.setElement(el);

    if (el) {
      // If the popover is already open (e.g. React mount after state
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
    destroy() {
      layer.destroy();
    },
  };
}
