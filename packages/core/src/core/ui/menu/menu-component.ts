import { defineComponent } from 'vjsc/components';
import type { MenuProps } from './menu-core';
import { MenuDataAttrs } from './menu-data-attrs';

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

export default defineComponent({
  name: 'Menu',
  root: 'Root',
  parts: {
    Root: defineComponent<MenuProps>(),
    Trigger: defineComponent<MenuTriggerProps>(),
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
