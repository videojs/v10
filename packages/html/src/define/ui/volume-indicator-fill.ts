import { safeDefine } from '../../registration/safe-define';
import { VolumeIndicatorFillElement } from '../../ui/volume-indicator/volume-indicator-fill-element';

safeDefine(VolumeIndicatorFillElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeIndicatorFillElement.tagName]: VolumeIndicatorFillElement;
  }
}
