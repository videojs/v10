import { TimeSliderChapterTitleElement } from '../../ui/time-slider/time-slider-chapters/time-slider-chapter-title-element';
import { safeDefine } from '../safe-define';

safeDefine(TimeSliderChapterTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSliderChapterTitleElement.tagName]: TimeSliderChapterTitleElement;
  }
}
