import { safeDefine } from '../../registration/safe-define';
import { AudioTrackRadioGroupElement } from '../../ui/audio-track-radio-group/audio-track-radio-group-element';

safeDefine(AudioTrackRadioGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioTrackRadioGroupElement.tagName]: AudioTrackRadioGroupElement;
  }
}
