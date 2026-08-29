import { safeDefine } from '../../registration/safe-define';
import { MenuGroupLabelElement } from '../../ui/menu/menu-group-label-element';

safeDefine(MenuGroupLabelElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuGroupLabelElement.tagName]: MenuGroupLabelElement;
  }
}
