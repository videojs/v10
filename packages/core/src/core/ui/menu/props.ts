import type { NonNullableObject } from '@videojs/utils/types';

import type { PopoverAlign, PopoverSide } from '../popover/props';

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

export type MenuItemSettingType = 'playback-rate' | 'quality' | 'captions';

export interface MenuTriggerProps {
  /** Disables the trigger. */
  disabled?: boolean | undefined;
  /** Setting kind for submenu triggers. */
  type?: MenuItemSettingType | undefined;
}

export interface MenuItemProps {
  /** Called when the item is selected. */
  onSelect?: (() => void) | undefined;
  /** Whether the item is disabled. */
  disabled?: boolean | undefined;
  /** Setting kind for submenu items. */
  type?: MenuItemSettingType | undefined;
}

export interface MenuCheckboxItemProps {
  /** Whether the item is currently checked. */
  checked: boolean;
  /** Called when the checked state should change. */
  onCheckedChange: (checked: boolean) => void;
  /** Whether the item is disabled. */
  disabled?: boolean | undefined;
}

export interface MenuRadioGroupProps {
  /** The currently selected value. */
  value: string;
  /** Called when the user selects a radio item. */
  onValueChange: (value: string) => void;
}

export interface MenuRadioItemProps {
  /** The value this item represents. */
  value: string;
  /** Whether the item is disabled. */
  disabled?: boolean | undefined;
}

export interface MenuItemIndicatorProps {
  /** Whether the indicator is currently shown. */
  checked?: boolean | undefined;
  /** Render even when unchecked, useful for animating out. */
  forceMount?: boolean | undefined;
}

export interface MenuBackProps {
  /** Accessible label for the back button. */
  label?: string | undefined;
}

export const MENU_DEFAULT_PROPS: NonNullableObject<MenuProps> = {
  side: 'bottom',
  align: 'start',
  open: false,
  defaultOpen: false,
  closeOnEscape: true,
  closeOnOutsideClick: true,
  isSubmenu: false,
};
