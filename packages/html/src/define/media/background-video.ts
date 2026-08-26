import { BackgroundVideoElement } from '../../media/background-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(BackgroundVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoElement.tagName]: BackgroundVideoElement;
  }
}
