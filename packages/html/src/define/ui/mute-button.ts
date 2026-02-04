import { MuteButtonElement } from '../../ui/mute-button/mute-button-element';

customElements.define(MuteButtonElement.tagName, MuteButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [MuteButtonElement.tagName]: MuteButtonElement;
  }
}
