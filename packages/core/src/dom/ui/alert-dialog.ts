import type { State } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

import type { AlertDialogInput } from '../../core/ui/alert-dialog/alert-dialog-core';
import { createDismissLayer } from './dismiss-layer';
import type { TransitionApi } from './transition';

export interface AlertDialogOptions {
  /** Transition API for animated open/close. */
  transition: TransitionApi;
  /** Called when the dialog open state changes. */
  onOpenChange: (open: boolean) => void;
  /** Called after open/close animations complete. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** Whether pressing Escape closes the dialog. Defaults to `true`. */
  closeOnEscape?: () => boolean;
}

export interface AlertDialogApi {
  /** Reactive transition state that platforms subscribe to for rendering. */
  input: State<AlertDialogInput>;
  /** Open the dialog, saving the currently focused element for later restoration. */
  open(): void;
  /** Close the dialog and restore focus after the close animation completes. */
  close(): void;
  /** Register the dialog element for focus management and button-click dismiss. */
  setElement(el: HTMLElement | null): void;
  /** Tear down all listeners and subscriptions. */
  destroy(): void;
}

export function createAlertDialog(options: AlertDialogOptions): AlertDialogApi {
  const { onOpenChange } = options;

  let element: HTMLElement | null = null;
  let previousFocus: HTMLElement | null = null;
  let elementAbort: AbortController | null = null;

  const layer = createDismissLayer({
    transition: options.transition,
    closeOnEscape: options.closeOnEscape,
    onEscapeDismiss(event) {
      event.stopPropagation();
      applyClose();
    },
  });

  const state = layer.input;

  // --- Open / Close ---

  function applyOpen(): void {
    previousFocus = document.activeElement as HTMLElement | null;

    const opening = layer.open();
    if (!opening) return;

    onOpenChange(true);

    // Defer focus to allow the element to render/mount.
    requestAnimationFrame(() => {
      if (layer.signal.aborted || !state.current.active) return;
      element?.focus();
    });

    opening.then(() => {
      if (layer.signal.aborted || !state.current.active) return;
      options.onOpenChangeComplete?.(true);
    });
  }

  function applyClose(): void {
    const closing = layer.close(element);
    if (!closing) return;

    onOpenChange(false);

    closing.then(() => {
      if (layer.signal.aborted) return;

      if (previousFocus) {
        previousFocus.focus();
        previousFocus = null;
      }

      options.onOpenChangeComplete?.(false);
    });
  }

  // --- Element management ---

  function setupElementListeners(): void {
    cleanupElementListeners();

    if (!element) return;

    elementAbort = new AbortController();
    const { signal } = elementAbort;

    listen(element, 'click', handleElementClick, { signal });
  }

  function cleanupElementListeners(): void {
    elementAbort?.abort();
    elementAbort = null;
  }

  function handleElementClick(event: MouseEvent): void {
    if (event.target instanceof HTMLButtonElement) {
      applyClose();
    }
  }

  function setElement(el: HTMLElement | null): void {
    element = el;
    setupElementListeners();
  }

  // --- Cleanup ---

  layer.signal.addEventListener('abort', () => {
    cleanupElementListeners();
    element = null;
    previousFocus = null;
  });

  return {
    input: state,
    open: applyOpen,
    close: applyClose,
    setElement,
    destroy: layer.destroy,
  };
}
