import { SimpleHlsVideo } from '../../media/simple-hls-video';
import { safeDefine } from '../safe-define';

export class SimpleHlsVideoElement extends SimpleHlsVideo {
  static readonly tagName = 'simple-hls-video';
}

safeDefine(SimpleHlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [SimpleHlsVideoElement.tagName]: SimpleHlsVideoElement;
  }
}
