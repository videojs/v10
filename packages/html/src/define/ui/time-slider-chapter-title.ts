import { safeDefine } from '../../registration/safe-define';
import { TimeSliderChapterTitleElement } from '../../ui/time-slider/chapter-title';

safeDefine(TimeSliderChapterTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSliderChapterTitleElement.tagName]: TimeSliderChapterTitleElement;
  }
}
