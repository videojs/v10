import { safeDefine } from '../../registration/safe-define';
import { MenuItemElement } from '../../ui/menu/item';

safeDefine(MenuItemElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuItemElement.tagName]: MenuItemElement;
  }
}
