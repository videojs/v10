import { SeekButtonElement } from '../../ui/seek-button/seek-button-element';

customElements.define(SeekButtonElement.tagName, SeekButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [SeekButtonElement.tagName]: SeekButtonElement;
  }
}
