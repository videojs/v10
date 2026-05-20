import { SimpleHlsVideo } from '../../media/simple-hls-video';
import { safeDefine } from '../safe-define';

/** Custom element shell for the `<simple-hls-video>` tag — minimal HLS engine for smaller bundle size. */
export class SimpleHlsVideoElement extends SimpleHlsVideo {
  /** Custom element tag name. */
  static readonly tagName = 'simple-hls-video';
}

safeDefine(SimpleHlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [SimpleHlsVideoElement.tagName]: SimpleHlsVideoElement;
  }
}
