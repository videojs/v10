import { MuxBackgroundVideoElement } from '../../media/mux-background-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(MuxBackgroundVideoElement);

export { MuxBackgroundVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [MuxBackgroundVideoElement.tagName]: MuxBackgroundVideoElement;
  }
}
