import { BackgroundVideoElement } from '../../media/background-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(BackgroundVideoElement);

export { BackgroundVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoElement.tagName]: BackgroundVideoElement;
  }
}
