import { MenuTransitionRootElement } from '../../ui/menu/menu-transition-root-element';
import { MenuTransitionViewElement } from '../../ui/menu/menu-transition-view-element';
import { safeDefine } from '../safe-define';
import './menu';

safeDefine(MenuTransitionRootElement);
safeDefine(MenuTransitionViewElement);

declare global {
  interface HTMLElementTagNameMap {
    [MenuTransitionRootElement.tagName]: MenuTransitionRootElement;
    [MenuTransitionViewElement.tagName]: MenuTransitionViewElement;
  }
}
