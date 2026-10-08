import { AudioSkinElement } from '../../presets/audio/skin';
import { safeDefine } from '../../registration/safe-define';
import '../../internal/skins/default-audio/register';

safeDefine(AudioSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioSkinElement.tagName]: AudioSkinElement;
  }
}
