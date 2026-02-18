import { PosterElement } from '../../ui/poster/poster-element';

customElements.define(PosterElement.tagName, PosterElement);

declare global {
  interface HTMLElementTagNameMap {
    [PosterElement.tagName]: PosterElement;
  }
}
