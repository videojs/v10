import { safeDefine } from '../../registration/safe-define';
import { TimeSliderChaptersElement } from '../../ui/time-slider/chapters';

safeDefine(TimeSliderChaptersElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSliderChaptersElement.tagName]: TimeSliderChaptersElement;
  }
}
