import { SliderChapterElement } from '../../ui/slider/slider-chapter-element';
import { safeDefine } from '../safe-define';

safeDefine(SliderChapterElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderChapterElement.tagName]: SliderChapterElement;
  }
}
