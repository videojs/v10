import { SliderTrackElement } from '../../ui/slider/slider-track-element';

export { SliderTrackElement };

customElements.define(SliderTrackElement.tagName, SliderTrackElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderTrackElement.tagName]: SliderTrackElement;
  }
}
