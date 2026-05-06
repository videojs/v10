import { VolumeIndicatorFillElement } from '../../ui/volume-indicator/volume-indicator-fill-element';
import { safeDefine } from '../safe-define';

safeDefine(VolumeIndicatorFillElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeIndicatorFillElement.tagName]: VolumeIndicatorFillElement;
  }
}
