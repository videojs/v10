import { defineComponent } from 'vjsc/components';

import type { MenuItemIndicatorProps, MenuItemProps, MenuProps, MenuTriggerProps } from './core';
import { MenuDataAttrs } from './data';

interface MenuRootProps extends MenuProps {
  /** Boundary used to constrain the root menu popup size. */
  boundary?: 'viewport' | 'container' | (string & {}) | undefined;
}

export default defineComponent({
  name: 'Menu',
  root: 'Root',
  parts: {
    Root: defineComponent<MenuRootProps>(),
    Trigger: defineComponent<MenuTriggerProps>(),
    Popup: defineComponent(),
    Content: defineComponent(),
    Group: defineComponent(),
    GroupLabel: defineComponent(),
    Item: defineComponent<MenuItemProps>(),
    ItemIndicator: defineComponent<MenuItemIndicatorProps>(),
    RadioGroup: defineComponent(),
    RadioItem: defineComponent<MenuItemProps>(),
    Separator: defineComponent(),
    CheckboxItem: defineComponent<MenuItemProps>(),
  },
  dataAttrs: MenuDataAttrs,
});
