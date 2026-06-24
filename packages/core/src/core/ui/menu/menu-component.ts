import { defineComponent } from '../manifest';
import { MenuDataAttrs } from './menu-data-attrs';
import type {
  MenuBackProps,
  MenuCheckboxItemProps,
  MenuItemIndicatorProps,
  MenuItemProps,
  MenuProps,
  MenuRadioGroupProps,
  MenuRadioItemProps,
  MenuTriggerProps,
} from './props';

export default defineComponent({
  name: 'Menu',
  parts: {
    Root: defineComponent<MenuProps>(),
    Trigger: defineComponent<MenuTriggerProps>(),
    Content: defineComponent(),
    View: defineComponent(),
    Back: defineComponent<MenuBackProps>(),
    Group: defineComponent(),
    GroupLabel: defineComponent(),
    Item: defineComponent<MenuItemProps>(),
    ItemIndicator: defineComponent<MenuItemIndicatorProps>(),
    ItemValue: defineComponent(),
    CheckboxItem: defineComponent<MenuCheckboxItemProps>(),
    RadioGroup: defineComponent<MenuRadioGroupProps>(),
    RadioItem: defineComponent<MenuRadioItemProps>(),
    Separator: defineComponent(),
  },
  dataAttrs: MenuDataAttrs,
});
