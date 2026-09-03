import { safeDefine } from '../../registration/safe-define';
import { MenuItemElement } from '../../ui/menu/menu-item-element';

safeDefine(MenuItemElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuItemElement.tagName]: MenuItemElement;
  }
}
