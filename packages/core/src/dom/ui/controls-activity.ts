import { isInteractiveTarget, listen } from '@videojs/utils/dom';

const TAP_THRESHOLD = 250;

export interface ControlsActivityOptions {
  setUserActivity: (active: boolean) => void;
  hideControls: () => void;
  toggleControls: () => void;
}

export interface ControlsActivityApi {
  destroy: () => void;
}

/**
 * Wire up controls activity tracking on a container element.
 *
 * Maps DOM pointer/keyboard events to store methods. The store
 * feature owns idle timer, visibility computation, and state.
 */
export function createControlsActivity(container: HTMLElement, options: ControlsActivityOptions): ControlsActivityApi {
  const disconnect = new AbortController();
  const { signal } = disconnect;

  let pointerDownTime = 0;

  listen(container, 'pointermove', () => options.setUserActivity(true), { signal });
  listen(container, 'keyup', () => options.setUserActivity(true), { signal });
  listen(container, 'focusin', () => options.setUserActivity(true), { signal });

  listen(
    container,
    'pointerdown',
    () => {
      pointerDownTime = Date.now();
    },
    { signal }
  );

  listen(
    container,
    'pointerup',
    ((event: PointerEvent) => {
      if (event.pointerType === 'touch' && Date.now() - pointerDownTime < TAP_THRESHOLD) {
        if (isInteractiveTarget(event)) return;
        options.toggleControls();
        return;
      }

      options.setUserActivity(true);
    }) as EventListener,
    { signal }
  );

  // On touch devices pointerleave fires after pointerup which would hide controls.
  // https://w3c.github.io/pointerevents/#dfn-pointerup
  listen(container, 'mouseleave', () => options.hideControls(), { signal });

  return {
    destroy() {
      disconnect.abort();
    },
  };
}
