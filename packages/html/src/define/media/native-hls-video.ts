import { NativeHlsVideoElement } from '../../media/native-hls-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(NativeHlsVideoElement);

export { NativeHlsVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [NativeHlsVideoElement.tagName]: NativeHlsVideoElement;
  }
}
