import { TimeSliderPointerElement, TimeSliderProgressElement, TimeSliderRootElement, TimeSliderThumbElement, TimeSliderTrackElement } from '@/elements/time-slider';
import { defineCustomElement } from '@/utils/custom-element';

defineCustomElement('media-time-slider', TimeSliderRootElement);
defineCustomElement('media-time-slider-track', TimeSliderTrackElement);
defineCustomElement('media-time-slider-progress', TimeSliderProgressElement);
defineCustomElement('media-time-slider-pointer', TimeSliderPointerElement);
defineCustomElement('media-time-slider-thumb', TimeSliderThumbElement);
