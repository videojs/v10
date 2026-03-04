import { PlaybackRateButtonElement } from '../../ui/playback-rate-button/playback-rate-button-element';
import { safeDefine } from '../safe-define';

safeDefine(PlaybackRateButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlaybackRateButtonElement.tagName]: PlaybackRateButtonElement;
  }
}
