import type { TransitionFlags } from '../transition';
import { getTransitionFlags, TransitionDataAttrs } from '../transition';
import type { StateAttrMap } from '../types';
import { MenuDataAttrs } from './menu-data-attrs';

export type MenuTransitionDirection = 'forward' | 'back';
export type MenuTransitionPhase = 'hidden' | 'entering' | 'active' | 'exiting';
export type MenuViewState = 'active' | 'inactive';

/** Render state for one live-DOM panel participating in a Menu transition. */
export interface MenuTransitionPanelState extends TransitionFlags {
  phase: MenuTransitionPhase;
  open: boolean;
  interactive: boolean;
  viewState: MenuViewState;
  direction: MenuTransitionDirection;
}

/** Stable structural and state attributes used by menu-bound transitions. */
export const MenuTransitionDataAttrs = {
  /** Present on every panel participating in a menu transition. */
  view: 'data-menu-view',
  /** Present on the generated root menu panel. */
  rootView: 'data-menu-root-view',
  /** Present on root-menu items that open a child menu panel. */
  hasSubmenu: 'data-has-submenu',
  /** Whether a panel is the active destination. */
  viewState: 'data-view-state',
  /** Navigation direction for the current panel transition. */
  direction: 'data-direction',
} as const;

/** Maps reactive transition state to the existing styling contract. */
export const MenuTransitionStateDataAttrs = {
  open: MenuDataAttrs.open,
  viewState: MenuTransitionDataAttrs.viewState,
  direction: MenuTransitionDataAttrs.direction,
  ...TransitionDataAttrs,
} as const satisfies StateAttrMap<MenuTransitionPanelState>;

/** Derives render state without mutating a platform element. */
export function getMenuTransitionPanelState(
  phase: MenuTransitionPhase,
  direction: MenuTransitionDirection
): MenuTransitionPanelState {
  const interactive = phase === 'entering' || phase === 'active';

  return {
    phase,
    open: phase !== 'hidden',
    interactive,
    viewState: interactive ? 'active' : 'inactive',
    direction,
    ...getTransitionFlags(phase === 'entering' ? 'starting' : phase === 'exiting' ? 'ending' : 'idle'),
  };
}

/** Returns the attributes a platform adapter should apply to a transition panel. */
export function getMenuTransitionPanelAttrs(state: MenuTransitionPanelState) {
  return {
    hidden: state.open ? undefined : true,
    inert: state.interactive ? undefined : true,
    'aria-hidden': state.interactive ? undefined : ('true' as const),
  };
}
