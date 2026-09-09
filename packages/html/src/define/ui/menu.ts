import { safeDefine } from '../../registration/safe-define';
import { MenuElement } from '../../ui/menu/element';

safeDefine(MenuElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuElement.tagName]: MenuElement;
  }
}
