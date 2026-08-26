import { safeDefine } from '../../registration/safe-define';
import { PlaybackRateButtonElement } from '../../ui/playback-rate-button/playback-rate-button-element';

safeDefine(PlaybackRateButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlaybackRateButtonElement.tagName]: PlaybackRateButtonElement;
  }
}
