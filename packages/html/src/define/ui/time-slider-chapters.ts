import { TimeSliderChapterTitleElement } from '../../ui/time-slider/time-slider-chapters/time-slider-chapter-title-element';
import { TimeSliderChaptersElement } from '../../ui/time-slider/time-slider-chapters/time-slider-chapters-element';
import { safeDefine } from '../safe-define';

safeDefine(TimeSliderChaptersElement);
safeDefine(TimeSliderChapterTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSliderChaptersElement.tagName]: TimeSliderChaptersElement;
    [TimeSliderChapterTitleElement.tagName]: TimeSliderChapterTitleElement;
  }
}
