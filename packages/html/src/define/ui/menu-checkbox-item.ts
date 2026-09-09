import { safeDefine } from '../../registration/safe-define';
import { MenuCheckboxItemElement } from '../../ui/menu/checkbox-item';

safeDefine(MenuCheckboxItemElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuCheckboxItemElement.tagName]: MenuCheckboxItemElement;
  }
}
