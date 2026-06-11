import { PlaybackRateRadioGroupElement } from '../../ui/playback-rate-radio-group/playback-rate-radio-group-element';
import { safeDefine } from '../safe-define';

safeDefine(PlaybackRateRadioGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlaybackRateRadioGroupElement.tagName]: PlaybackRateRadioGroupElement;
  }
}
