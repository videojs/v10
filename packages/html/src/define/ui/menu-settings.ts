import { MenuItemValueElement } from '../../ui/menu/menu-item-value-element';
import { safeDefine } from '../safe-define';
import './menu';

safeDefine(MenuItemValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuItemValueElement.tagName]: MenuItemValueElement;
  }
}
