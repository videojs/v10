import { safeDefine } from '../../registration/safe-define';
import { MenuContentElement } from '../../ui/menu/content';

safeDefine(MenuContentElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuContentElement.tagName]: MenuContentElement;
  }
}
