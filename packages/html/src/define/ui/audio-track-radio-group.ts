import { AudioTrackRadioGroupElement } from '../../ui/audio-track-radio-group/audio-track-radio-group-element';
import { safeDefine } from '../safe-define';

safeDefine(AudioTrackRadioGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioTrackRadioGroupElement.tagName]: AudioTrackRadioGroupElement;
  }
}
