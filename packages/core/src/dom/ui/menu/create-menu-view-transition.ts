import { createState, type State } from '@videojs/store';
import {
  type DoubleAnimationFrameHandles,
  resetDoubleAnimationFrameHandles,
  scheduleDoubleAnimationFrame,
} from '@videojs/utils/dom';
import { getTransitionStyleAttrs, type TransitionStyleAttrs } from '../../../core/ui/transition';
import { applyElementProps } from '../../utils/element-props';
import { forceLayout } from '../../utils/layout';
import { scheduleTransitionSettle, waitForAnimations as waitForElementAnimations } from '../transition';

import type { NavigationState } from './create-menu';

export type MenuViewTransitionPhase = 'hidden' | 'entering' | 'active' | 'exiting';

export type MenuViewTransitionDirection = NavigationState['direction'];

export interface MenuViewTransitionState {
  phase: MenuViewTransitionPhase;
  direction: MenuViewTransitionDirection;
  triggerId: string | null;
  transitioning?: boolean;
}

export interface MenuViewTransitionSyncOptions {
  active: boolean;
  direction: MenuViewTransitionDirection;
  triggerId?: string | null;
}

export interface MenuViewTransitionAttrs extends TransitionStyleAttrs {
  'data-menu-view': '';
  'data-menu-view-id'?: string | undefined;
  'data-direction': MenuViewTransitionDirection;
  'data-open'?: '' | undefined;
  hidden: boolean;
}

export interface MenuViewTransitionAttrsOptions {
  id?: string;
  root?: boolean;
  persistent?: boolean;
}

export interface MenuViewTransitionOptions {
  focusFirstItem?: (element: HTMLElement) => void;
  restoreFocus?: (triggerId: string | null) => void;
  waitForAnimations?: (element: HTMLElement) => Promise<void>;
  persistent?: boolean;
}

export interface MenuViewTransitionApi {
  input: State<MenuViewTransitionState>;
  readonly persistent: boolean;
  setElement: (element: HTMLElement | null) => void;
  sync: (options: MenuViewTransitionSyncOptions) => void;
  reset: () => void;
  destroy: () => void;
}

export const DEFAULT_MENU_VIEW_TRANSITION_STATE: MenuViewTransitionState = {
  phase: 'hidden',
  direction: 'forward',
  triggerId: null,
  transitioning: false,
};

export const PERSISTENT_MENU_VIEW_RESTING_STATE: MenuViewTransitionState = {
  phase: 'active',
  direction: 'forward',
  triggerId: null,
  transitioning: false,
};

const MENU_VIEW_EXIT_OPACITY_THRESHOLD = 0.01;

function focusFirstMenuViewItem(element: HTMLElement): void {
  const firstItem = element.querySelector<HTMLElement>('[data-item]');

  firstItem?.focus({ preventScroll: true });
}

function hasMenuViewOpenAttr(state: MenuViewTransitionState, persistent: boolean): boolean {
  if (persistent) {
    return state.phase === 'active' || state.phase === 'entering';
  }

  return state.phase !== 'hidden';
}

export function getMenuViewTransitionAttrs(
  state: MenuViewTransitionState,
  { id, root = false, persistent = false }: MenuViewTransitionAttrsOptions = {}
): MenuViewTransitionAttrs {
  const viewId = id ?? (root ? 'root' : undefined);

  return {
    'data-menu-view': '',
    ...(viewId && { 'data-menu-view-id': viewId }),
    'data-direction': state.direction,
    ...getTransitionStyleAttrs({
      transitioning: state.transitioning,
      transitionStarting: state.phase === 'entering',
      transitionEnding: state.phase === 'exiting',
    }),
    'data-open': hasMenuViewOpenAttr(state, persistent) ? '' : undefined,
    hidden: persistent ? false : state.phase === 'hidden',
  };
}

export function applyMenuViewTransitionAttrs(
  element: HTMLElement,
  state: MenuViewTransitionState,
  options: MenuViewTransitionAttrsOptions = {}
): void {
  applyElementProps(element, getMenuViewTransitionAttrs(state, options));
}

function isMenuViewExitVisuallyComplete(view: HTMLElement): boolean {
  const style = getComputedStyle(view);
  const opacity = Number.parseFloat(style.opacity);

  if (Number.isFinite(opacity) && opacity <= MENU_VIEW_EXIT_OPACITY_THRESHOLD) {
    return true;
  }

  const parent = view.parentElement;

  if (!parent) return false;

  const rect = view.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();

  return rect.right <= parentRect.left || rect.left >= parentRect.right;
}

export function createMenuViewTransition(options: MenuViewTransitionOptions = {}): MenuViewTransitionApi {
  const persistent = options.persistent ?? false;
  const restingState = persistent ? PERSISTENT_MENU_VIEW_RESTING_STATE : DEFAULT_MENU_VIEW_TRANSITION_STATE;
  const input = createState<MenuViewTransitionState>(restingState);
  const waitForAnimations =
    options.waitForAnimations ??
    ((element: HTMLElement) => waitForElementAnimations(element, { includeCSSTransitions: true }));
  const focusFirstItem = options.focusFirstItem ?? focusFirstMenuViewItem;

  let element: HTMLElement | null = null;
  let transitionId = 0;
  const enterRafs: DoubleAnimationFrameHandles = { first: 0, second: 0 };
  let exitRaf = 0;
  let focusRaf = 0;
  let cancelExitSettle: (() => void) | null = null;
  let scheduledTransitionId = 0;
  let scheduledPhase: MenuViewTransitionPhase | null = null;

  function cancelFrames(): void {
    cancelAnimationFrame(enterRafs.first);
    cancelAnimationFrame(enterRafs.second);
    cancelAnimationFrame(exitRaf);
    cancelAnimationFrame(focusRaf);
    resetDoubleAnimationFrameHandles(enterRafs);
    cancelExitSettle?.();
    cancelExitSettle = null;
    exitRaf = 0;
    focusRaf = 0;
    scheduledTransitionId = 0;
    scheduledPhase = null;
  }

  function scheduleCurrentPhase(): void {
    const { phase } = input.current;

    if (!element || (phase !== 'entering' && phase !== 'exiting')) return;
    if (scheduledTransitionId === transitionId && scheduledPhase === phase) return;

    scheduledTransitionId = transitionId;
    scheduledPhase = phase;

    if (phase === 'entering') {
      scheduleEnterComplete(transitionId, element);
    } else {
      scheduleExitComplete(transitionId, element);
    }
  }

  function scheduleEnterComplete(currentTransitionId: number, currentElement: HTMLElement): void {
    forceLayout(currentElement);

    scheduleDoubleAnimationFrame(
      enterRafs,
      () => currentTransitionId === transitionId,
      () => {
        forceLayout(currentElement);
        input.patch({ phase: 'active' });

        if (!persistent) {
          focusRaf = requestAnimationFrame(() => {
            if (currentTransitionId !== transitionId) return;
            focusFirstItem(currentElement);
          });
        }

        waitForAnimations(currentElement).then(
          () => {
            if (currentTransitionId !== transitionId) return;
            input.patch({ transitioning: false });
          },
          () => {
            if (currentTransitionId !== transitionId) return;
            input.patch({ transitioning: false });
          }
        );
      }
    );
  }

  function scheduleExitComplete(currentTransitionId: number, currentElement: HTMLElement): void {
    forceLayout(currentElement);

    if (persistent) {
      cancelExitSettle = scheduleTransitionSettle(
        currentElement,
        () => currentTransitionId === transitionId,
        () => {
          if (currentTransitionId !== transitionId) return;

          input.patch({ phase: 'hidden', triggerId: null, transitioning: false });
        },
        { includeCSSTransitions: true, isVisuallyComplete: isMenuViewExitVisuallyComplete }
      );
      return;
    }

    exitRaf = requestAnimationFrame(() => {
      if (currentTransitionId !== transitionId) return;

      waitForAnimations(currentElement).then(
        () => {
          if (currentTransitionId !== transitionId) return;

          const { direction, triggerId } = input.current;

          input.patch({ phase: 'hidden', triggerId: null, transitioning: false });

          if (direction === 'back') {
            options.restoreFocus?.(triggerId);
          }
        },
        () => {
          if (currentTransitionId !== transitionId) return;

          const { direction, triggerId } = input.current;

          input.patch({ phase: 'hidden', triggerId: null, transitioning: false });

          if (direction === 'back') {
            options.restoreFocus?.(triggerId);
          }
        }
      );
    });
  }

  function startEnter(direction: MenuViewTransitionDirection, triggerId: string | null): void {
    transitionId++;
    cancelFrames();

    input.patch({
      phase: 'entering',
      direction,
      triggerId,
      transitioning: true,
    });
    scheduleCurrentPhase();
  }

  function startExit(direction: MenuViewTransitionDirection): void {
    transitionId++;
    cancelFrames();

    input.patch({
      phase: 'exiting',
      direction,
      transitioning: true,
    });
    scheduleCurrentPhase();
  }

  function setElement(nextElement: HTMLElement | null): void {
    if (element === nextElement) return;

    element = nextElement;
    scheduleCurrentPhase();
  }

  function sync({ active, direction, triggerId = null }: MenuViewTransitionSyncOptions): void {
    const { phase } = input.current;

    if (active && (phase === 'hidden' || phase === 'exiting')) {
      startEnter(direction, triggerId);
    } else if (!active && (phase === 'active' || phase === 'entering')) {
      startExit(direction);
    }
  }

  function reset(): void {
    transitionId++;
    cancelFrames();
    input.patch(restingState);
  }

  function destroy(): void {
    transitionId++;
    cancelFrames();
    element = null;
    input.patch(restingState);
  }

  return {
    input,
    persistent,
    setElement,
    sync,
    reset,
    destroy,
  };
}
