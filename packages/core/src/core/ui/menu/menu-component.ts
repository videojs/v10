import { defineComponent } from 'vjsc/components';
import type { MenuItemIndicatorProps, MenuItemProps, MenuProps, MenuTriggerProps } from './menu-core';
import { MenuDataAttrs } from './menu-data-attrs';

export default defineComponent({
  name: 'Menu',
  root: 'Root',
  parts: {
    Root: defineComponent<MenuProps>(),
    Trigger: defineComponent<MenuTriggerProps>(),
    SubmenuTrigger: defineComponent<MenuTriggerProps>(),
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
