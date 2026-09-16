import { safeDefine } from '../../registration/safe-define';
import { SliderTrackElement } from '../../ui/slider/track';

safeDefine(SliderTrackElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderTrackElement.tagName]: SliderTrackElement;
  }
}
