import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { PopoverAlign, PopoverSide } from '../popover/core';
import type { TransitionFlags, TransitionState, TransitionStatus } from '../transition';
import { getTransitionFlags } from '../transition';

export type { PopoverAlign, PopoverSide };

export interface MenuProps {
  /** Preferred side of the trigger for the menu. Root menus only. */
  side?: PopoverSide | undefined;
  /** Alignment along the trigger's edge. Root menus only. */
  align?: PopoverAlign | undefined;
  /** Controlled open state. */
  open?: boolean | undefined;
  /** Initial open state (uncontrolled). */
  defaultOpen?: boolean | undefined;
  /** Close the menu when Escape is pressed at root level. */
  closeOnEscape?: boolean | undefined;
  /** Close the menu when clicking outside. Root menus only. */
  closeOnOutsideClick?: boolean | undefined;
}

export interface MenuTriggerProps {
  disabled?: boolean | undefined;
}

export interface MenuItemProps {
  disabled?: boolean | undefined;
}

export interface MenuItemIndicatorProps {
  checked?: boolean | undefined;
  forceMount?: boolean | undefined;
}

/** Runtime input derived by framework adapters and `createTransition`. */
export interface MenuInput extends TransitionState {
  /** Whether this menu is nested inside another menu's content. */
  isSubmenu: boolean;
}

export interface MenuState extends TransitionFlags {
  open: boolean;
  status: TransitionStatus;
  /** Preferred side of the trigger for the menu. Root menus only. */
  side: PopoverSide | undefined;
  align: PopoverAlign | undefined;
  /** Whether this menu is nested inside another menu's content. */
  isSubmenu: boolean;
}

/** Base menu logic: ARIA attributes and open/close state computation. */
export class MenuCore {
  static readonly defaultProps: NonNullableObject<MenuProps> = {
    side: 'bottom',
    align: 'start',
    open: false,
    defaultOpen: false,
    closeOnEscape: true,
    closeOnOutsideClick: true,
  };

  #props = { ...MenuCore.defaultProps };
  #input: MenuInput | null = null;

  get props(): Readonly<NonNullableObject<MenuProps>> {
    return this.#props;
  }

  constructor(props?: MenuProps) {
    if (props) this.setProps(props);
  }

  setProps(props: MenuProps): void {
    this.#props = defaults(props, MenuCore.defaultProps);
  }

  setInput(input: MenuInput): void {
    this.#input = input;
  }

  getState(): MenuState {
    const input = this.#input!;
    const isSubmenu = input.isSubmenu;

    return {
      open: input.active,
      status: input.status,
      side: isSubmenu ? undefined : this.#props.side,
      align: isSubmenu ? undefined : this.#props.align,
      isSubmenu,
      ...getTransitionFlags(input.status),
    };
  }

  getTriggerAttrs(state: MenuState, contentId?: string) {
    return {
      ...(!state.isSubmenu && { tabIndex: 0 }),
      'aria-haspopup': 'menu' as const,
      'aria-expanded': state.open && state.status !== 'ending' ? 'true' : 'false',
      'aria-controls': contentId,
    };
  }

  getContentAttrs() {
    return {
      role: 'menu' as const,
      tabIndex: -1,
    };
  }

  getPopupAttrs() {
    return { popover: 'manual' as const };
  }
}

export namespace MenuCore {
  export type Props = MenuProps;
  export type State = MenuState;
  export type Input = MenuInput;
}
