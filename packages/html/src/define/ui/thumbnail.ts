import { ThumbnailElement } from '../../ui/thumbnail/thumbnail-element';

customElements.define(ThumbnailElement.tagName, ThumbnailElement);

declare global {
  interface HTMLElementTagNameMap {
    [ThumbnailElement.tagName]: ThumbnailElement;
  }
}
