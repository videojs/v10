import { SliderBufferElement } from '../../ui/slider/slider-buffer-element';

export { SliderBufferElement };

customElements.define(SliderBufferElement.tagName, SliderBufferElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderBufferElement.tagName]: SliderBufferElement;
  }
}
