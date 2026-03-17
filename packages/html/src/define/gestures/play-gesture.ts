import { PlayGestureElement } from '../../gestures/play-gesture/play-gesture-element';
import { safeDefine } from '../safe-define';

safeDefine(PlayGestureElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlayGestureElement.tagName]: PlayGestureElement;
  }
}
