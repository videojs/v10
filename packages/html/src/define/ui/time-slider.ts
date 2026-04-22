import { SliderBufferElement } from '../../ui/slider/slider-buffer-element';
import { SliderFillElement } from '../../ui/slider/slider-fill-element';
import { SliderPreviewElement } from '../../ui/slider/slider-preview-element';
import { SliderThumbElement } from '../../ui/slider/slider-thumb-element';
import { SliderThumbnailElement } from '../../ui/slider/slider-thumbnail-element';
import { SliderTrackElement } from '../../ui/slider/slider-track-element';
import { SliderValueElement } from '../../ui/slider/slider-value-element';
import { TimeSliderElement } from '../../ui/time-slider/time-slider-element';
import { defineTimeSlider } from './compounds';

defineTimeSlider();

declare global {
  interface HTMLElementTagNameMap {
    [TimeSliderElement.tagName]: TimeSliderElement;
    [SliderBufferElement.tagName]: SliderBufferElement;
    [SliderFillElement.tagName]: SliderFillElement;
    [SliderPreviewElement.tagName]: SliderPreviewElement;
    [SliderThumbElement.tagName]: SliderThumbElement;
    [SliderThumbnailElement.tagName]: SliderThumbnailElement;
    [SliderTrackElement.tagName]: SliderTrackElement;
    [SliderValueElement.tagName]: SliderValueElement;
  }
}
