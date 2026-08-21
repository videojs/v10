import { GifVideo } from '../../media/gif-video';
import { safeDefine } from '../safe-define';

export class GifVideoElement extends GifVideo {
  static readonly tagName = 'gif-video';
}

safeDefine(GifVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [GifVideoElement.tagName]: GifVideoElement;
  }
}
