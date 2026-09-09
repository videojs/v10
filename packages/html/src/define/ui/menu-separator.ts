import { safeDefine } from '../../registration/safe-define';
import { MenuSeparatorElement } from '../../ui/menu/separator';

safeDefine(MenuSeparatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuSeparatorElement.tagName]: MenuSeparatorElement;
  }
}
