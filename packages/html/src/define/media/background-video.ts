import { BackgroundVideo } from '../../media/background-video';
import { safeDefine } from '../safe-define';

export class BackgroundVideoElement extends BackgroundVideo {
  static readonly tagName = 'background-video';
}

safeDefine(BackgroundVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoElement.tagName]: BackgroundVideoElement;
  }
}
