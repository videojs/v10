import { safeDefine } from '../../registration/safe-define';
import { TimeSliderElement } from '../../ui/time-slider/element';

safeDefine(TimeSliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSliderElement.tagName]: TimeSliderElement;
  }
}
