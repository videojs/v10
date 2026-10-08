import { LiveAudioPlayerElement } from '../../presets/live-audio/player';
import { safeDefine } from '../../registration/safe-define';

safeDefine(LiveAudioPlayerElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveAudioPlayerElement.tagName]: LiveAudioPlayerElement;
  }
}
