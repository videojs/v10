import { SliderBufferElement } from '../../ui/slider/slider-buffer-element';

customElements.define(SliderBufferElement.tagName, SliderBufferElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderBufferElement.tagName]: SliderBufferElement;
  }
}
