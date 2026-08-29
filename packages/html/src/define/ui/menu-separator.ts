import { safeDefine } from '../../registration/safe-define';
import { MenuSeparatorElement } from '../../ui/menu/menu-separator-element';

safeDefine(MenuSeparatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuSeparatorElement.tagName]: MenuSeparatorElement;
  }
}
