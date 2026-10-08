import { BackgroundVideoPlayerElement } from '../../presets/background/player';
import { safeDefine } from '../../registration/safe-define';

safeDefine(BackgroundVideoPlayerElement);

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoPlayerElement.tagName]: BackgroundVideoPlayerElement;
  }
}
