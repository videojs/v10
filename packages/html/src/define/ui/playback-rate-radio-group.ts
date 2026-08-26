import { safeDefine } from '../../registration/safe-define';
import { PlaybackRateRadioGroupElement } from '../../ui/playback-rate-radio-group/playback-rate-radio-group-element';

safeDefine(PlaybackRateRadioGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlaybackRateRadioGroupElement.tagName]: PlaybackRateRadioGroupElement;
  }
}
