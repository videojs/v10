import { defineComponent } from '../manifest';
import type { MenuProps } from './menu-core';
import { MenuDataAttrs } from './menu-data-attrs';

export default defineComponent<MenuProps>()({
  name: 'Menu',
  parts: [
    'Root',
    'Trigger',
    'Content',
    'View',
    'Back',
    'Group',
    'GroupLabel',
    'Item',
    'ItemIndicator',
    'ItemValue',
    'CheckboxItem',
    'RadioGroup',
    'RadioItem',
    'Separator',
  ] as const,
  dataAttrs: MenuDataAttrs,
});
