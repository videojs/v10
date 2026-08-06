import { SliderSegmentsElement } from '../../ui/slider/slider-segments-element';
import { TimeSliderSegmentsElement } from '../../ui/time-slider/time-slider-segments-element';
import { safeDefine } from '../safe-define';

safeDefine(SliderSegmentsElement);
safeDefine(TimeSliderSegmentsElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderSegmentsElement.tagName]: SliderSegmentsElement;
    [TimeSliderSegmentsElement.tagName]: TimeSliderSegmentsElement;
  }
}
