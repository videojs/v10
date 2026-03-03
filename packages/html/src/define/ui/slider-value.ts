import { SliderValueElement } from '../../ui/slider/slider-value-element';

export { SliderValueElement };

customElements.define(SliderValueElement.tagName, SliderValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderValueElement.tagName]: SliderValueElement;
  }
}
