import { defineComponent, defineComponentPart } from '../manifest';
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

export default defineComponent()({
  name: 'Menu',
  parts: {
    Root: defineComponentPart<MenuProps>(),
    Trigger: defineComponentPart<MenuTriggerProps>(),
    Content: defineComponentPart(),
    View: defineComponentPart(),
    Back: defineComponentPart<MenuBackProps>(),
    Group: defineComponentPart(),
    GroupLabel: defineComponentPart(),
    Item: defineComponentPart<MenuItemProps>(),
    ItemIndicator: defineComponentPart<MenuItemIndicatorProps>(),
    ItemValue: defineComponentPart(),
    CheckboxItem: defineComponentPart<MenuCheckboxItemProps>(),
    RadioGroup: defineComponentPart<MenuRadioGroupProps>(),
    RadioItem: defineComponentPart<MenuRadioItemProps>(),
    Separator: defineComponentPart(),
  },
  dataAttrs: MenuDataAttrs,
});
