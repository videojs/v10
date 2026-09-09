import { safeDefine } from '../../registration/safe-define';
import { MenuRadioGroupElement } from '../../ui/menu/radio-group';

safeDefine(MenuRadioGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuRadioGroupElement.tagName]: MenuRadioGroupElement;
  }
}
