import { safeDefine } from '../../registration/safe-define';
import { TimeSliderChapterTitleElement } from '../../ui/time-slider/time-slider-chapters/time-slider-chapter-title-element';

safeDefine(TimeSliderChapterTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSliderChapterTitleElement.tagName]: TimeSliderChapterTitleElement;
  }
}
