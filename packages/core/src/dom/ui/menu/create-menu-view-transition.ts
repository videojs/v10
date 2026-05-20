import { createState, type State } from '@videojs/store';
import { getTransitionStyleAttrs, type TransitionStyleAttrs } from '../../../core/ui/transition';
import { forceLayout } from '../../utils/layout';

import type { NavigationState } from './create-menu';

/** Lifecycle phase of a menu view (page) inside a paged menu transition. */
export type MenuViewTransitionPhase = 'hidden' | 'entering' | 'active' | 'exiting';

/** Navigation direction tracked by the view transition. */
export type MenuViewTransitionDirection = NavigationState['direction'];

/** Coarse activity state derived from {@link MenuViewTransitionPhase}. */
export type MenuViewState = 'active' | 'inactive';

/** Reactive state surfaced by the menu view transition controller. */
export interface MenuViewTransitionState {
  /** Current lifecycle phase. */
  phase: MenuViewTransitionPhase;
  /** Direction the navigation is moving. */
  direction: MenuViewTransitionDirection;
  /** ID of the trigger that opened this view, used for focus restoration. */
  triggerId: string | null;
}

/** Inputs for {@link MenuViewTransitionApi.sync}. */
export interface MenuViewTransitionSyncOptions {
  /** Whether this view should be active. */
  active: boolean;
  /** Direction to animate. */
  direction: MenuViewTransitionDirection;
  /** ID of the trigger that opened the view (used for back-focus). */
  triggerId?: string | null;
}

/** Concrete data attributes the controller writes onto the view element. */
export interface MenuViewTransitionAttrs extends TransitionStyleAttrs {
  /** Always empty — marks the element as a menu view. */
  'data-menu-view': '';
  /** Coarse activity state. */
  'data-menu-view-state': MenuViewState;
  /** Navigation direction. */
  'data-direction': MenuViewTransitionDirection;
  /** Present when the view is mounted. */
  'data-open'?: '' | undefined;
  /** Whether the element should be `hidden`. */
  hidden: boolean;
}

/** Options for {@link createMenuViewTransition}. */
export interface MenuViewTransitionOptions {
  /** Focus the first interactive item inside the view after it activates. */
  focusFirstItem?: (element: HTMLElement) => void;
  /** Restore focus to the trigger element after a back navigation. */
  restoreFocus?: (triggerId: string | null) => void;
  /** Wait for the view's CSS animations to settle before tearing down. */
  waitForAnimations?: (element: HTMLElement) => Promise<void>;
}

/** Imperative handle returned by {@link createMenuViewTransition}. */
export interface MenuViewTransitionApi {
  /** Reactive view transition state. */
  input: State<MenuViewTransitionState>;
  /** Register the DOM element backing this view. */
  setElement: (element: HTMLElement | null) => void;
  /** Drive the next transition based on the desired active state. */
  sync: (options: MenuViewTransitionSyncOptions) => void;
  /** Tear down the controller. */
  destroy: () => void;
}

const DEFAULT_MENU_VIEW_TRANSITION_STATE: MenuViewTransitionState = {
  phase: 'hidden',
  direction: 'forward',
  triggerId: null,
};

async function waitForElementAnimations(element: HTMLElement): Promise<void> {
  const animations = element.getAnimations?.() ?? [];

  if (!animations.length) return;

  await Promise.all(animations.map((animation) => animation.finished)).catch(() => {});
}

function focusFirstMenuViewItem(element: HTMLElement): void {
  const firstItem = element.querySelector<HTMLElement>('[data-item]');

  firstItem?.focus({ preventScroll: true });
}

function getMenuViewState(phase: MenuViewTransitionPhase): MenuViewState {
  return phase === 'entering' || phase === 'active' ? 'active' : 'inactive';
}

/**
 * Project menu view transition state to the attributes the renderer applies to the view element.
 *
 * @param state - Current view transition state.
 */
export function getMenuViewTransitionAttrs(state: MenuViewTransitionState): MenuViewTransitionAttrs {
  return {
    'data-menu-view': '',
    'data-menu-view-state': getMenuViewState(state.phase),
    'data-direction': state.direction,
    ...getTransitionStyleAttrs({
      transitionStarting: state.phase === 'entering',
      transitionEnding: state.phase === 'exiting',
    }),
    'data-open': state.phase !== 'hidden' ? '' : undefined,
    hidden: state.phase === 'hidden',
  };
}

/**
 * Build a per-view transition controller for a paged menu.
 *
 * @param options - Focus restoration and animation hooks.
 */
export function createMenuViewTransition(options: MenuViewTransitionOptions = {}): MenuViewTransitionApi {
  const input = createState<MenuViewTransitionState>(DEFAULT_MENU_VIEW_TRANSITION_STATE);
  const waitForAnimations = options.waitForAnimations ?? waitForElementAnimations;
  const focusFirstItem = options.focusFirstItem ?? focusFirstMenuViewItem;

  let element: HTMLElement | null = null;
  let transitionId = 0;
  let raf1 = 0;
  let raf2 = 0;
  let focusRaf = 0;
  let scheduledTransitionId = 0;
  let scheduledPhase: MenuViewTransitionPhase | null = null;

  function cancelFrames(): void {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
    cancelAnimationFrame(focusRaf);
    raf1 = 0;
    raf2 = 0;
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

    raf1 = requestAnimationFrame(() => {
      if (currentTransitionId !== transitionId) return;

      raf2 = requestAnimationFrame(() => {
        if (currentTransitionId !== transitionId) return;

        forceLayout(currentElement);
        input.patch({ phase: 'active' });

        focusRaf = requestAnimationFrame(() => {
          if (currentTransitionId !== transitionId) return;
          focusFirstItem(currentElement);
        });
      });
    });
  }

  function scheduleExitComplete(currentTransitionId: number, currentElement: HTMLElement): void {
    forceLayout(currentElement);

    raf1 = requestAnimationFrame(async () => {
      await waitForAnimations(currentElement);

      if (currentTransitionId !== transitionId) return;

      const { direction, triggerId } = input.current;

      input.patch({
        phase: 'hidden',
        triggerId: null,
      });

      if (direction === 'back') {
        options.restoreFocus?.(triggerId);
      }
    });
  }

  function startEnter(direction: MenuViewTransitionDirection, triggerId: string | null): void {
    transitionId++;
    cancelFrames();

    input.patch({
      phase: 'entering',
      direction,
      triggerId,
    });
    scheduleCurrentPhase();
  }

  function startExit(direction: MenuViewTransitionDirection): void {
    transitionId++;
    cancelFrames();

    input.patch({
      phase: 'exiting',
      direction,
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

  function destroy(): void {
    transitionId++;
    cancelFrames();
    element = null;
    input.patch(DEFAULT_MENU_VIEW_TRANSITION_STATE);
  }

  return {
    input,
    setElement,
    sync,
    destroy,
  };
}
