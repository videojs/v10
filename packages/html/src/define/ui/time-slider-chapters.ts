import { safeDefine } from '../../registration/safe-define';
import { TimeSliderChaptersElement } from '../../ui/time-slider/time-slider-chapters/time-slider-chapters-element';

safeDefine(TimeSliderChaptersElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSliderChaptersElement.tagName]: TimeSliderChaptersElement;
  }
}
