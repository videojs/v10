import { VideoPlayerElement } from '../../presets/video/player';
import { safeDefine } from '../../registration/safe-define';

safeDefine(VideoPlayerElement);

declare global {
  interface HTMLElementTagNameMap {
    [VideoPlayerElement.tagName]: VideoPlayerElement;
  }
}
