import { PlaybackRateButtonElement } from '../../ui/playback-rate-button/playback-rate-button-element';

customElements.define(PlaybackRateButtonElement.tagName, PlaybackRateButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlaybackRateButtonElement.tagName]: PlaybackRateButtonElement;
  }
}
