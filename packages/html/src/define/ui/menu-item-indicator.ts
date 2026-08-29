import { safeDefine } from '../../registration/safe-define';
import { MenuItemIndicatorElement } from '../../ui/menu/menu-item-indicator-element';

safeDefine(MenuItemIndicatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuItemIndicatorElement.tagName]: MenuItemIndicatorElement;
  }
}
