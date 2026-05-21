import { createState, type State } from '@videojs/store';
import { getMaxCSSTransitionTime } from '@videojs/utils/dom';
import { noop } from '@videojs/utils/function';
import type { TransitionState } from '../../core/ui/transition';

export interface TransitionApi {
  state: State<TransitionState>;
  setElement(el: HTMLElement | null): void;
  open(el?: HTMLElement | null): Promise<void>;
  close(el: HTMLElement | null): Promise<void>;
  cancel(): void;
  destroy(): void;
}

export interface WaitForAnimationsOptions {
  includeCSSTransitions?: boolean;
}

/**
 * Manages open/close transition lifecycle via `createState`.
 *
 * **Open:** patches `{ active: true, status: 'starting', transitioning: true }`, then
 * after a double-RAF patches `{ status: 'idle' }` so the browser paints the
 * initial ("from") state before transitioning. `transitioning` stays true
 * until the element's animations settle.
 *
 * **Close:** patches `{ status: 'ending', transitioning: true }` (keeping
 * `active: true` so the element stays mounted), then after a double-RAF waits
 * for `getAnimations({ subtree: true })` to settle before patching
 * `{ active: false, status: 'idle' }`.
 */
export function createTransition(): TransitionApi {
  const state = createState<TransitionState>({ active: false, status: 'idle', transitioning: false });

  let destroyed = false;
  let element: HTMLElement | null = null;
  let transitionId = 0;
  let rafId1 = 0;
  let rafId2 = 0;

  function setElement(el: HTMLElement | null): void {
    element = el;
  }

  function cancelFrames(): void {
    cancelAnimationFrame(rafId1);
    cancelAnimationFrame(rafId2);
    rafId1 = 0;
    rafId2 = 0;
  }

  function open(el?: HTMLElement | null): Promise<void> {
    transitionId++;
    const currentTransitionId = transitionId;
    cancelFrames();

    if (el !== undefined) {
      element = el;
    }

    state.patch({ active: true, status: 'starting', transitioning: true });

    return new Promise<void>((resolve) => {
      rafId1 = requestAnimationFrame(() => {
        rafId1 = 0;
        rafId2 = requestAnimationFrame(() => {
          rafId2 = 0;
          if (destroyed || currentTransitionId !== transitionId || !state.current.active) return resolve();
          state.patch({ status: 'idle' });
          waitForAnimations(element).finally(() => {
            if (destroyed || currentTransitionId !== transitionId || !state.current.active) return resolve();
            state.patch({ transitioning: false });
            resolve();
          });
        });
      });
    });
  }

  function close(el: HTMLElement | null): Promise<void> {
    transitionId++;
    const currentTransitionId = transitionId;
    cancelFrames();

    element = el;

    state.patch({ status: 'ending', transitioning: true });

    return new Promise<void>((resolve) => {
      rafId1 = requestAnimationFrame(() => {
        rafId1 = 0;
        rafId2 = requestAnimationFrame(() => {
          rafId2 = 0;
          if (destroyed || currentTransitionId !== transitionId) return resolve();
          waitForAnimations(el).finally(() => {
            if (destroyed || currentTransitionId !== transitionId || state.current.status !== 'ending') {
              return resolve();
            }
            state.patch({ active: false, status: 'idle', transitioning: false });
            resolve();
          });
        });
      });
    });
  }

  function cancel(): void {
    transitionId++;
    cancelFrames();
    if (state.current.status !== 'idle' || state.current.transitioning) {
      state.patch({ status: 'idle', transitioning: false });
    }
  }

  return {
    state,
    setElement,
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

export function waitForAnimations(
  el: HTMLElement | null,
  { includeCSSTransitions = false }: WaitForAnimationsOptions = {}
): Promise<void> {
  if (!el) return Promise.resolve();

  // Include descendant animations so nested menu views (submenus) keep the root
  // layer in `ending` until their CSS animations finish.
  const animations = el.getAnimations?.({ subtree: true }) ?? [];
  const transitionTime = includeCSSTransitions ? getMaxCSSTransitionTime(el) : 0;
  const transitionPromise =
    transitionTime > 0
      ? new Promise<void>((resolve) => {
          setTimeout(resolve, transitionTime);
        })
      : Promise.resolve();

  if (animations.length === 0) return transitionPromise;

  // Canceled animations reject `finished`; handle each one so a single
  // cancellation does not short-circuit the CSS transition fallback.
  const animationPromises = animations.map((animation) => animation.finished.catch(noop));

  return Promise.all([transitionPromise, ...animationPromises]).then(noop);
}
