import { GestureElement } from '../../ui/gesture/gesture-element';
import { safeDefine } from '../safe-define';

safeDefine(GestureElement);

declare global {
  interface HTMLElementTagNameMap {
    [GestureElement.tagName]: GestureElement;
  }
}
