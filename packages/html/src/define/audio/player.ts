import { AudioPlayerElement } from '../../presets/audio/player';
import { safeDefine } from '../../registration/safe-define';

safeDefine(AudioPlayerElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioPlayerElement.tagName]: AudioPlayerElement;
  }
}
