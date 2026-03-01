import { SliderFillElement } from '../../ui/slider/slider-fill-element';

customElements.define(SliderFillElement.tagName, SliderFillElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderFillElement.tagName]: SliderFillElement;
  }
}
