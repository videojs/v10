import { SliderBufferElement } from '../../ui/slider/slider-buffer-element';
import { SliderElement } from '../../ui/slider/slider-element';
import { SliderFillElement } from '../../ui/slider/slider-fill-element';
import { SliderThumbElement } from '../../ui/slider/slider-thumb-element';
import { SliderTrackElement } from '../../ui/slider/slider-track-element';
import { SliderValueElement } from '../../ui/slider/slider-value-element';

customElements.define(SliderElement.tagName, SliderElement);
customElements.define(SliderTrackElement.tagName, SliderTrackElement);
customElements.define(SliderFillElement.tagName, SliderFillElement);
customElements.define(SliderBufferElement.tagName, SliderBufferElement);
customElements.define(SliderThumbElement.tagName, SliderThumbElement);
customElements.define(SliderValueElement.tagName, SliderValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderElement.tagName]: SliderElement;
    [SliderTrackElement.tagName]: SliderTrackElement;
    [SliderFillElement.tagName]: SliderFillElement;
    [SliderBufferElement.tagName]: SliderBufferElement;
    [SliderThumbElement.tagName]: SliderThumbElement;
    [SliderValueElement.tagName]: SliderValueElement;
  }
}
