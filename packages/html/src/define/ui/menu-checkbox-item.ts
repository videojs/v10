import { safeDefine } from '../../registration/safe-define';
import { MenuCheckboxItemElement } from '../../ui/menu/menu-checkbox-item-element';

safeDefine(MenuCheckboxItemElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuCheckboxItemElement.tagName]: MenuCheckboxItemElement;
  }
}
