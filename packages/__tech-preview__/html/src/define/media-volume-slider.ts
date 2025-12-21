import { VolumeSliderIndicatorElement, VolumeSliderRootElement, VolumeSliderThumbElement, VolumeSliderTrackElement } from '@/elements/volume-slider';
import { defineCustomElement } from '@/utils/custom-element';

defineCustomElement('media-volume-slider', VolumeSliderRootElement);
defineCustomElement('media-volume-slider-track', VolumeSliderTrackElement);
defineCustomElement('media-volume-slider-indicator', VolumeSliderIndicatorElement);
defineCustomElement('media-volume-slider-thumb', VolumeSliderThumbElement);
