import { NativeHlsVideo } from '../../media/native-hls-video';
import { safeDefine } from '../safe-define';

/** Custom element shell for the `<native-hls-video>` tag — HLS playback using the browser's native engine (Safari, etc.). */
export class NativeHlsVideoElement extends NativeHlsVideo {
  /** Custom element tag name. */
  static readonly tagName = 'native-hls-video';
}

safeDefine(NativeHlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [NativeHlsVideoElement.tagName]: NativeHlsVideoElement;
  }
}
