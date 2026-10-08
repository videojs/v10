import { CompatLiveAudioSkinElement } from '../../presets/live-audio/compat-skin';
import { safeDefine } from '../../registration/safe-define';
import '../../internal/skins/compat-live-audio/register';

safeDefine(CompatLiveAudioSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [CompatLiveAudioSkinElement.tagName]: CompatLiveAudioSkinElement;
  }
}
