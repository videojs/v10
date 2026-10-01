import { NeutralAudioSkinElement } from '../../presets/audio/neutral-skin';
import { safeDefine } from '../../registration/safe-define';
import '../../internal/skins/neutral-audio/register';

safeDefine(NeutralAudioSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [NeutralAudioSkinElement.tagName]: NeutralAudioSkinElement;
  }
}
