import { safeDefine } from '../../registration/safe-define';
import { MenuRadioGroupElement } from '../../ui/menu/menu-radio-group-element';

safeDefine(MenuRadioGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuRadioGroupElement.tagName]: MenuRadioGroupElement;
  }
}
