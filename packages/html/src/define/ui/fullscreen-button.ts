import { FullscreenButtonElement } from '../../ui/fullscreen-button/fullscreen-button-element';

customElements.define(FullscreenButtonElement.tagName, FullscreenButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [FullscreenButtonElement.tagName]: FullscreenButtonElement;
  }
}
