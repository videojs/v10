import { PlayButtonElement } from '../../ui/play-button/play-button-element';

customElements.define(PlayButtonElement.tagName, PlayButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlayButtonElement.tagName]: PlayButtonElement;
  }
}
