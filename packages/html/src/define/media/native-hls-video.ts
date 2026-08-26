import { NativeHlsVideo } from '../../media/native-hls-video';
import { safeDefine } from '../../registration/safe-define';

/** Browser-native HLS media element registered as `<native-hls-video>`. */
export class NativeHlsVideoElement extends NativeHlsVideo {
  static readonly tagName = 'native-hls-video';
}

safeDefine(NativeHlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [NativeHlsVideoElement.tagName]: NativeHlsVideoElement;
  }
}
