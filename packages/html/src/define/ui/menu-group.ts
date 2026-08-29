import { safeDefine } from '../../registration/safe-define';
import { MenuGroupElement } from '../../ui/menu/menu-group-element';

safeDefine(MenuGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuGroupElement.tagName]: MenuGroupElement;
  }
}
