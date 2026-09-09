import { safeDefine } from '../../registration/safe-define';
import { MenuRadioItemElement } from '../../ui/menu/radio-item';

safeDefine(MenuRadioItemElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuRadioItemElement.tagName]: MenuRadioItemElement;
  }
}
