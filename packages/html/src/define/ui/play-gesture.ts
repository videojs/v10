import { PlayGestureElement } from '../../ui/play-gesture/play-gesture-element';
import { safeDefine } from '../safe-define';

safeDefine(PlayGestureElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlayGestureElement.tagName]: PlayGestureElement;
  }
}
