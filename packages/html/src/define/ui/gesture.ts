import { safeDefine } from '../../registration/safe-define';
import { GestureElement } from '../../ui/gesture/gesture-element';

safeDefine(GestureElement);

declare global {
  interface HTMLElementTagNameMap {
    [GestureElement.tagName]: GestureElement;
  }
}
