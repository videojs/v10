import { PlaybackRateRadioGroupElement } from '../../ui/playback-rate-radio-group/playback-rate-radio-group-element';
import { safeDefine } from '../safe-define';
import { defineMenu } from './compounds';

defineMenu();
safeDefine(PlaybackRateRadioGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlaybackRateRadioGroupElement.tagName]: PlaybackRateRadioGroupElement;
  }
}
