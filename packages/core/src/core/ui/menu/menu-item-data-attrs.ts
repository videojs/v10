/** Data attributes set on all navigable menu item elements. */
export const MenuItemDataAttrs = {
  /**
   * Present on all navigable item types: Item, RadioItem, CheckboxItem, and
   * the Trigger when acting as a submenu trigger inside a parent menu.
   * Use `[data-item]` as a shared selector to target all item types at once.
   */
  item: 'data-item',
  /** Present when the item has keyboard or pointer focus (via roving tabindex). */
  highlighted: 'data-highlighted',
} as const;
