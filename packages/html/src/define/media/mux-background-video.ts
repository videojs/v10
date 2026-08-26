import { MuxBackgroundVideoElement } from '../../media/mux-background-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(MuxBackgroundVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [MuxBackgroundVideoElement.tagName]: MuxBackgroundVideoElement;
  }
}
