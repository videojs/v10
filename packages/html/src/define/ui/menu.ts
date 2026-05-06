import { MenuBackElement } from '../../ui/menu/menu-back-element';
import { MenuCheckboxItemElement } from '../../ui/menu/menu-checkbox-item-element';
import { MenuElement } from '../../ui/menu/menu-element';
import { MenuGroupElement } from '../../ui/menu/menu-group-element';
import { MenuItemElement } from '../../ui/menu/menu-item-element';
import { MenuItemIndicatorElement } from '../../ui/menu/menu-item-indicator-element';
import { MenuLabelElement } from '../../ui/menu/menu-label-element';
import { MenuRadioGroupElement } from '../../ui/menu/menu-radio-group-element';
import { MenuRadioItemElement } from '../../ui/menu/menu-radio-item-element';
import { MenuSeparatorElement } from '../../ui/menu/menu-separator-element';
import { MenuViewElement } from '../../ui/menu/menu-view-element';
import { defineMenu } from './compounds';

defineMenu();

declare global {
  interface HTMLElementTagNameMap {
    [MenuElement.tagName]: MenuElement;
    [MenuBackElement.tagName]: MenuBackElement;
    [MenuItemElement.tagName]: MenuItemElement;
    [MenuLabelElement.tagName]: MenuLabelElement;
    [MenuSeparatorElement.tagName]: MenuSeparatorElement;
    [MenuGroupElement.tagName]: MenuGroupElement;
    [MenuRadioGroupElement.tagName]: MenuRadioGroupElement;
    [MenuRadioItemElement.tagName]: MenuRadioItemElement;
    [MenuCheckboxItemElement.tagName]: MenuCheckboxItemElement;
    [MenuItemIndicatorElement.tagName]: MenuItemIndicatorElement;
    [MenuViewElement.tagName]: MenuViewElement;
  }
}
