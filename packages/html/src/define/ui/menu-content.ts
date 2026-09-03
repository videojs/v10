import { safeDefine } from '../../registration/safe-define';
import { MenuContentElement } from '../../ui/menu/menu-content-element';

safeDefine(MenuContentElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuContentElement.tagName]: MenuContentElement;
  }
}
