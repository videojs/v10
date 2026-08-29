import { safeDefine } from '../../registration/safe-define';
import { MenuRadioItemElement } from '../../ui/menu/menu-radio-item-element';

safeDefine(MenuRadioItemElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuRadioItemElement.tagName]: MenuRadioItemElement;
  }
}
