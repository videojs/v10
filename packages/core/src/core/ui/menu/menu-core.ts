import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';
import type { PopoverAlign, PopoverSide } from '../popover/popover-core';
import type { TransitionFlags, TransitionState, TransitionStatus } from '../transition';
import { getTransitionFlags } from '../transition';

export type { PopoverAlign, PopoverSide };

export interface MenuProps {
  /** Which side of the trigger the menu appears on. Root menus only. */
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
  /** True when this menu instance is nested inside a parent menu's content. */
  isSubmenu?: boolean | undefined;
}

/** Raw transition state provided by `createTransition`. */
export interface MenuInput extends TransitionState {}

export interface MenuState extends TransitionFlags {
  open: boolean;
  status: TransitionStatus;
  side: PopoverSide;
  align: PopoverAlign;
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
    isSubmenu: false,
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
    return {
      open: input.active,
      status: input.status,
      side: this.#props.side,
      align: this.#props.align,
      isSubmenu: this.#props.isSubmenu,
      ...getTransitionFlags(input.status),
    };
  }

  getTriggerAttrs(state: MenuState, contentId?: string) {
    return {
      'aria-haspopup': 'menu' as const,
      'aria-expanded': state.open ? 'true' : 'false',
      'aria-controls': contentId,
    };
  }

  getContentAttrs(state: MenuState) {
    return {
      role: 'menu' as const,
      tabIndex: -1,
      // Root menus use the Popover API for dismiss and focus handling.
      // Submenus render inline inside the parent viewport — no popover.
      ...(!state.isSubmenu && { popover: 'manual' as const }),
    };
  }
}

export namespace MenuCore {
  export type Props = MenuProps;
  export type State = MenuState;
  export type Input = MenuInput;
}
