import { safeDefine } from '../../registration/safe-define';
import { MenuGroupElement } from '../../ui/menu/group';

safeDefine(MenuGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuGroupElement.tagName]: MenuGroupElement;
  }
}
