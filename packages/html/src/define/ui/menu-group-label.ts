import { safeDefine } from '../../registration/safe-define';
import { MenuGroupLabelElement } from '../../ui/menu/group-label';

safeDefine(MenuGroupLabelElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuGroupLabelElement.tagName]: MenuGroupLabelElement;
  }
}
