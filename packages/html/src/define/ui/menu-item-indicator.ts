import { safeDefine } from '../../registration/safe-define';
import { MenuItemIndicatorElement } from '../../ui/menu/item-indicator';

safeDefine(MenuItemIndicatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuItemIndicatorElement.tagName]: MenuItemIndicatorElement;
  }
}
