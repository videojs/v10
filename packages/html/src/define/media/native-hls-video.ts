import { NativeHlsVideoElement } from '../../media/native-hls-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(NativeHlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [NativeHlsVideoElement.tagName]: NativeHlsVideoElement;
  }
}
