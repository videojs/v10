import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';
import type { PopoverAlign, PopoverSide } from '../popover/popover-core';
import type { TransitionFlags, TransitionState, TransitionStatus } from '../transition';
import { getTransitionFlags } from '../transition';

export type { PopoverAlign, PopoverSide };

/** Props for the menu core. */
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

/** Reactive state surfaced by the menu core. */
export interface MenuState extends TransitionFlags {
  /** Whether the menu is currently open. */
  open: boolean;
  /** Current transition status of the menu's open/close animation. */
  status: TransitionStatus;
  /** Side of the trigger the menu appears on; `undefined` for submenus. */
  side: PopoverSide | undefined;
  /** Alignment along the trigger's edge; `undefined` for submenus. */
  align: PopoverAlign | undefined;
  /** Whether this menu is nested inside another menu's content. */
  isSubmenu: boolean;
}

/** Base menu logic: ARIA attributes and open/close state computation. */
export class MenuCore {
  /** Default values applied when a prop is omitted. */
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

  /** Current resolved props (defaults merged in). */
  get props(): Readonly<NonNullableObject<MenuProps>> {
    return this.#props;
  }

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: MenuProps) {
    if (props) this.setProps(props);
  }

  /** Update props on the core. */
  setProps(props: MenuProps): void {
    this.#props = defaults(props, MenuCore.defaultProps);
  }

  /** Push transition input from the surrounding transition controller. */
  setInput(input: MenuInput): void {
    this.#input = input;
  }

  /** Recompute and return the current state. */
  getState(): MenuState {
    const input = this.#input!;
    const isSubmenu = this.#props.isSubmenu;

    return {
      open: input.active,
      status: input.status,
      side: isSubmenu ? undefined : this.#props.side,
      align: isSubmenu ? undefined : this.#props.align,
      isSubmenu,
      ...getTransitionFlags(input.status),
    };
  }

  /** Compute ARIA attributes for the menu trigger button. */
  getTriggerAttrs(state: MenuState, contentId?: string) {
    return {
      'aria-haspopup': 'menu' as const,
      'aria-expanded': state.open ? 'true' : 'false',
      'aria-controls': contentId,
    };
  }

  /** Compute ARIA and popover attributes for the menu content panel. */
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
  /** Alias for {@link MenuProps}. */
  export type Props = MenuProps;
  /** Alias for {@link MenuState}. */
  export type State = MenuState;
  /** Alias for {@link MenuInput}. */
  export type Input = MenuInput;
}
