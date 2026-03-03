import { SliderFillElement } from '../../ui/slider/slider-fill-element';

export { SliderFillElement };

customElements.define(SliderFillElement.tagName, SliderFillElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderFillElement.tagName]: SliderFillElement;
  }
}
