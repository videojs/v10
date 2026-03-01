import { SliderThumbElement } from '../../ui/slider/slider-thumb-element';

customElements.define(SliderThumbElement.tagName, SliderThumbElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderThumbElement.tagName]: SliderThumbElement;
  }
}
