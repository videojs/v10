import { createState, type State } from '@videojs/store';
import { noop } from '@videojs/utils/function';
import type { TransitionState } from '../../core/ui/transition';

export interface TransitionHandler {
  state: State<TransitionState>;
  open(): Promise<void>;
  close(el: HTMLElement | null): Promise<void>;
  cancel(): void;
  destroy(): void;
}

/**
 * Manages open/close transition lifecycle via `createState`.
 *
 * **Open:** patches `{ open: true, status: 'starting' }`, then after one
 * RAF patches `{ status: 'idle' }` so the browser paints the initial
 * state before transitioning.
 *
 * **Close:** patches `{ status: 'ending' }` (keeping `open: true` so the
 * element stays mounted), then after a double-RAF waits for
 * `getAnimations()` to settle before patching `{ open: false, status: 'idle' }`.
 */
export function createTransitionHandler(): TransitionHandler {
  const state = createState<TransitionState>({ open: false, status: 'idle' });

  let destroyed = false;
  let rafId1 = 0;
  let rafId2 = 0;

  function open(): Promise<void> {
    cancelAnimationFrame(rafId1);
    cancelAnimationFrame(rafId2);
    rafId1 = 0;
    rafId2 = 0;

    state.patch({ open: true, status: 'starting' });

    return new Promise<void>((resolve) => {
      rafId1 = requestAnimationFrame(() => {
        rafId1 = 0;
        if (destroyed || !state.current.open) return resolve();
        state.patch({ status: 'idle' });
        resolve();
      });
    });
  }

  function close(el: HTMLElement | null): Promise<void> {
    cancelAnimationFrame(rafId1);
    cancelAnimationFrame(rafId2);
    rafId1 = 0;
    rafId2 = 0;

    state.patch({ status: 'ending' });

    return new Promise<void>((resolve) => {
      rafId1 = requestAnimationFrame(() => {
        rafId1 = 0;
        rafId2 = requestAnimationFrame(() => {
          rafId2 = 0;
          if (destroyed) return resolve();
          waitForAnimations(el).finally(() => {
            if (destroyed || state.current.status !== 'ending') return resolve();
            state.patch({ open: false, status: 'idle' });
            resolve();
          });
        });
      });
    });
  }

  function cancel(): void {
    cancelAnimationFrame(rafId1);
    cancelAnimationFrame(rafId2);
    rafId1 = 0;
    rafId2 = 0;
    if (state.current.status !== 'idle') {
      state.patch({ status: 'idle' });
    }
  }

  return {
    state,
    open,
    close,
    cancel,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancel();
    },
  };
}

function waitForAnimations(el: HTMLElement | null): Promise<void> {
  if (!el) return Promise.resolve();

  const animations = el.getAnimations?.() ?? [];

  if (animations.length === 0) return Promise.resolve();

  return Promise.all(animations.map((a) => a.finished)).then(noop, noop);
}
