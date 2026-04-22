import { SliderElement } from '../../ui/slider/slider-element';
import { SliderFillElement } from '../../ui/slider/slider-fill-element';
import { SliderPreviewElement } from '../../ui/slider/slider-preview-element';
import { SliderThumbElement } from '../../ui/slider/slider-thumb-element';
import { SliderTrackElement } from '../../ui/slider/slider-track-element';
import { SliderValueElement } from '../../ui/slider/slider-value-element';
import { defineSlider } from './compounds';

defineSlider();

declare global {
  interface HTMLElementTagNameMap {
    [SliderElement.tagName]: SliderElement;
    [SliderFillElement.tagName]: SliderFillElement;
    [SliderPreviewElement.tagName]: SliderPreviewElement;
    [SliderThumbElement.tagName]: SliderThumbElement;
    [SliderTrackElement.tagName]: SliderTrackElement;
    [SliderValueElement.tagName]: SliderValueElement;
  }
}
