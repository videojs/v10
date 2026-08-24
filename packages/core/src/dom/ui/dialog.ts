import type { State } from '@videojs/store';
import { containsComposed, getDeepActiveElement, listen } from '@videojs/utils/dom';

import type { DialogInput } from '../../core/ui/dialog/dialog-core';
import { createDismissLayer } from './dismiss-layer';
import type { TransitionApi } from './transition';

const TABBABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'audio[controls]',
  'video[controls]',
  'iframe',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ActiveDialog {
  token: symbol;
  isolate: () => void;
  restore: () => void;
}

const activeDialogs: ActiveDialog[] = [];
const inertElements = new WeakMap<HTMLElement, { count: number; wasInert: boolean }>();

export interface DialogOptions {
  /** Transition API for animated open/close. */
  transition: TransitionApi;
  /** Called when the dialog open state changes. */
  onOpenChange: (open: boolean) => void;
  /** Called after open/close animations complete. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** Whether pressing Escape closes the dialog. Defaults to `true`. */
  closeOnEscape?: () => boolean;
}

export interface DialogTriggerProps {
  onClick: (event: UIEvent) => void;
}

export interface DialogApi {
  /** Reactive transition state that platforms subscribe to for rendering. */
  input: State<DialogInput>;
  /** Props for a trigger that opens the dialog. */
  triggerProps: DialogTriggerProps;
  /** Open the dialog and save the currently focused element for restoration. */
  open(): void;
  /** Close the dialog and restore focus after the close animation completes. */
  close(): void;
  /** Register the trigger for focus restoration. */
  setTriggerElement(el: HTMLElement | null): void;
  /** Register the popup for focus management and transitions. */
  setPopupElement(el: HTMLElement | null): void;
  /** @deprecated Use `setPopupElement`. */
  setElement(el: HTMLElement | null): void;
  /** Tear down all listeners and subscriptions. */
  destroy(): void;
}

/**
 * Manages modal dialog transitions, dismissal, initial focus, focus trapping,
 * and focus restoration.
 */
export function createDialog(options: DialogOptions): DialogApi {
  let popupElement: HTMLElement | null = null;
  let triggerElement: HTMLElement | null = null;
  let previousFocus: HTMLElement | null = null;
  let focusFrame = 0;
  const isolatedElements = new Set<HTMLElement>();
  const stackEntry: ActiveDialog = {
    token: Symbol('dialog'),
    isolate: isolateBackground,
    restore: restoreBackground,
  };

  const layer = createDismissLayer({
    transition: options.transition,
    closeOnEscape: () => isTopDialog(stackEntry) && (options.closeOnEscape?.() ?? true),
    onEscapeDismiss(event) {
      event.preventDefault();
      event.stopPropagation();
      applyClose();
    },
    onDocumentActive(signal) {
      listen(document, 'keydown', handleDocumentKeydown, { capture: true, signal });
      listen(document, 'focusin', handleDocumentFocusin, { signal });
    },
  });

  const state = layer.input;

  function applyOpen(): void {
    previousFocus = getDeepActiveElement() as HTMLElement | null;

    const opening = layer.open(() => popupElement);
    if (!opening) return;

    pushDialog(stackEntry);
    options.onOpenChange(true);
    scheduleInitialFocus();

    opening.then(() => {
      if (layer.signal.aborted || !state.current.active || state.current.status !== 'idle') return;
      options.onOpenChangeComplete?.(true);
    });
  }

  function applyClose(): void {
    const closing = layer.close(popupElement);
    if (!closing) return;

    cancelAnimationFrame(focusFrame);
    focusFrame = 0;
    options.onOpenChange(false);

    closing.then(() => {
      if (layer.signal.aborted || state.current.active) return;

      popDialog(stackEntry);
      const restoreTarget = triggerElement?.isConnected ? triggerElement : previousFocus;
      if (restoreTarget?.isConnected) restoreTarget.focus();
      previousFocus = null;

      options.onOpenChangeComplete?.(false);
    });
  }

  function scheduleInitialFocus(): void {
    cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(() => {
      focusFrame = 0;
      if (layer.signal.aborted || !state.current.active || !popupElement) return;

      const autofocus = popupElement.querySelector<HTMLElement>('[autofocus]');
      const target = autofocus ?? getTabbableElements(popupElement)[0] ?? popupElement;
      target.focus();
    });
  }

  function handleDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !state.current.active || !isTopDialog(stackEntry) || !popupElement) return;

    const tabbable = getTabbableElements(popupElement);
    if (tabbable.length === 0) {
      event.preventDefault();
      popupElement.focus();
      return;
    }

    const active = getDeepActiveElement();
    const first = tabbable[0]!;
    const last = tabbable[tabbable.length - 1]!;

    if (event.shiftKey && (active === first || !active || !containsComposed(popupElement, active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !active || !containsComposed(popupElement, active))) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleDocumentFocusin(event: FocusEvent): void {
    if (!state.current.active || !isTopDialog(stackEntry) || !popupElement) return;
    if (event.target instanceof Element && containsComposed(popupElement, event.target)) return;

    const target = getTabbableElements(popupElement)[0] ?? popupElement;
    target.focus();
  }

  function setTriggerElement(el: HTMLElement | null): void {
    triggerElement = el;
  }

  function setPopupElement(el: HTMLElement | null): void {
    if (popupElement !== el) restoreBackground();
    popupElement = el;
    if (el && state.current.active && isTopDialog(stackEntry)) isolateBackground();
    const active = getDeepActiveElement();
    if (el && state.current.active && (!active || !containsComposed(el, active))) {
      scheduleInitialFocus();
    }
  }

  layer.signal.addEventListener('abort', () => {
    cancelAnimationFrame(focusFrame);
    focusFrame = 0;
    popDialog(stackEntry);
    popupElement = null;
    triggerElement = null;
    previousFocus = null;
  });

  return {
    input: state,
    triggerProps: {
      onClick() {
        applyOpen();
      },
    },
    open: applyOpen,
    close: applyClose,
    setTriggerElement,
    setPopupElement,
    setElement: setPopupElement,
    destroy: layer.destroy,
  };

  function isolateBackground(): void {
    if (!popupElement?.isConnected || isolatedElements.size > 0) return;

    let current: Element = popupElement;
    while (current !== document.body) {
      const parent = current.parentElement;
      if (parent) {
        for (const sibling of parent.children) {
          if (sibling !== current && sibling instanceof HTMLElement) acquireInert(sibling);
        }
        current = parent;
        continue;
      }

      const root = current.getRootNode();
      if (!(root instanceof ShadowRoot)) break;

      for (const sibling of root.children) {
        if (sibling !== current && sibling instanceof HTMLElement) acquireInert(sibling);
      }
      current = root.host;
    }
  }

  function acquireInert(element: HTMLElement): void {
    isolatedElements.add(element);

    const entry = inertElements.get(element);
    if (entry) {
      entry.count++;
      return;
    }

    inertElements.set(element, { count: 1, wasInert: element.hasAttribute('inert') });
    element.setAttribute('inert', '');
  }

  function restoreBackground(): void {
    for (const element of isolatedElements) {
      const entry = inertElements.get(element);
      if (!entry) continue;

      entry.count--;
      if (entry.count > 0) continue;

      inertElements.delete(element);
      if (!entry.wasInert) element.removeAttribute('inert');
    }
    isolatedElements.clear();
  }
}

function pushDialog(dialog: ActiveDialog): void {
  const index = activeDialogs.indexOf(dialog);
  if (index >= 0) activeDialogs.splice(index, 1);

  activeDialogs.at(-1)?.restore();
  dialog.restore();
  activeDialogs.push(dialog);
  dialog.isolate();
}

function popDialog(dialog: ActiveDialog): void {
  const index = activeDialogs.indexOf(dialog);
  if (index < 0) return;

  const wasTop = index === activeDialogs.length - 1;
  dialog.restore();
  activeDialogs.splice(index, 1);
  if (wasTop) activeDialogs.at(-1)?.isolate();
}

function isTopDialog(dialog: ActiveDialog): boolean {
  return activeDialogs.at(-1) === dialog;
}

function getTabbableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(isTabbable);
}

function isTabbable(element: HTMLElement): boolean {
  if (element.tabIndex < 0 || element.hidden) return false;
  if (element.closest('[inert],[hidden],[aria-hidden="true"]')) return false;
  return true;
}
