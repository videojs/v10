import { defineMenu } from '../../registration/ui-compounds';
import { MenuCheckboxItemElement } from '../../ui/menu/menu-checkbox-item-element';
import { MenuContentElement } from '../../ui/menu/menu-content-element';
import { MenuElement } from '../../ui/menu/menu-element';
import { MenuGroupElement } from '../../ui/menu/menu-group-element';
import { MenuGroupLabelElement } from '../../ui/menu/menu-group-label-element';
import { MenuItemElement } from '../../ui/menu/menu-item-element';
import { MenuItemIndicatorElement } from '../../ui/menu/menu-item-indicator-element';
import { MenuRadioGroupElement } from '../../ui/menu/menu-radio-group-element';
import { MenuRadioItemElement } from '../../ui/menu/menu-radio-item-element';
import { MenuSeparatorElement } from '../../ui/menu/menu-separator-element';

defineMenu();

declare global {
  interface HTMLElementTagNameMap {
    [MenuElement.tagName]: MenuElement;
    [MenuContentElement.tagName]: MenuContentElement;
    [MenuItemElement.tagName]: MenuItemElement;
    [MenuGroupLabelElement.tagName]: MenuGroupLabelElement;
    [MenuSeparatorElement.tagName]: MenuSeparatorElement;
    [MenuGroupElement.tagName]: MenuGroupElement;
    [MenuRadioGroupElement.tagName]: MenuRadioGroupElement;
    [MenuRadioItemElement.tagName]: MenuRadioItemElement;
    [MenuCheckboxItemElement.tagName]: MenuCheckboxItemElement;
    [MenuItemIndicatorElement.tagName]: MenuItemIndicatorElement;
  }
}
